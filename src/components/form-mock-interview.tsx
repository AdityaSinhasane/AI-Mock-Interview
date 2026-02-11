import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Loader, Trash2 } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import type { Interview } from "@/types";
import { db } from "@/config/firebase.config";
import { generateWithGemini } from "@/scripts";

import CustomBreadCrumb from "./custom-bread-crumb";
import { Headings } from "./headings";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

/* ---------------- SCHEMA ---------------- */

const formSchema = z.object({
  position: z.string().min(1),
  description: z.string().min(10),
  experience: z.number().min(0),
  techStack: z.string().min(1),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  initialData: Interview | null;
}

export default function FormMockInterview({ initialData }: Props) {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);

  /* ---------------- FORM ---------------- */

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: "",
      description: "",
      experience: 0,
      techStack: "",
    },
  });

  /* ---------------- AI ---------------- */

const generateAiResponse = async (data: FormData) => {
  try {
    const prompt = `
Generate 5 DIFFERENT interview questions with answers.

STRICT FORMAT:
1. Question: <text>
   Answer: <text>
2. Question: <text>
   Answer: <text>
3. Question: <text>
   Answer: <text>
4. Question: <text>
   Answer: <text>
5. Question: <text>
   Answer: <text>

Rules:
- Exactly 5
- No JSON
- No markdown
- No extra text

Job Role: ${data.position}
Description: ${data.description}
Experience: ${data.experience}
Tech Stack: ${data.techStack}
`;

    const text = await generateWithGemini(prompt);

    console.log("RAW AI OUTPUT >>>", text);

    const blocks = text.split(/\n\d+\.\s/).filter(Boolean);

    if (blocks.length < 5) {
      throw new Error("Less than 5 questions returned");
    }

    return blocks.slice(0, 5).map((block) => {
      const q = block.match(/Question:\s*(.*)/i);
      const a = block.match(/Answer:\s*(.*)/i);

      return {
        question: q?.[1]?.trim() || "Question missing",
        answer: a?.[1]?.trim() || "Answer missing",
      };
    });
  } catch (error) {
    console.error("AI generation failed ❌", error);

    return [
      {
        question: `Explain ${data.techStack}`,
        answer: `${data.techStack} is used in real-world development.`,
      },
      {
        question: `What are use cases of ${data.techStack}?`,
        answer: `It is used in multiple applications.`,
      },
      {
        question: `What challenges exist in ${data.techStack}?`,
        answer: `Challenges include scalability and performance.`,
      },
      {
        question: `How do you optimize ${data.techStack}?`,
        answer: `Using best practices and tools.`,
      },
      {
        question: `Why learn ${data.techStack}?`,
        answer: `It improves career opportunities.`,
      },
    ];
  }
};

  /* ---------------- SUBMIT ---------------- */

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const questions = await generateAiResponse(data);

      if (initialData) {
        await updateDoc(doc(db, "interviews", initialData.id), {
          ...data,
          questions,
          updatedAt: serverTimestamp(),
        });
        toast("Updated successfully");
      } else {
        await addDoc(collection(db, "interviews"), {
          ...data,
          questions,
          userId,
          createdAt: serverTimestamp(),
        });
        toast("Created successfully");
      }

      navigate("/generate", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- EFFECT ---------------- */

  useEffect(() => {
    if (initialData) {
      form.reset({
        position: initialData.position,
        description: initialData.description,
        experience: initialData.experience,
        techStack: initialData.techStack,
      });
    }
  }, [initialData, form]);

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-4">
      <CustomBreadCrumb
        breadCrumbPage={initialData ? initialData.position : "Create"}
        breadCrumpItems={[{ label: "Mock Interviews", link: "/generate" }]}
      />

      <div className="flex justify-between items-center">
        <Headings
          title={initialData ? initialData.position : "Create Mock Interview"}
          isSubHeading
        />
        {initialData && (
          <Button size="icon" variant="ghost">
            <Trash2 className="text-red-500" />
          </Button>
        )}
      </div>

      <Separator />

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 p-6 shadow rounded"
        >
          <FormField
            name="position"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="description"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="experience"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience (years)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    disabled={loading}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="techStack"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tech Stack</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={loading}>
            {loading ? <Loader className="animate-spin" /> : "Submit"}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
