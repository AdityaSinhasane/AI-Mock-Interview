import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { chatSession } from "@/scripts";

import CustomBreadCrumb from "./custom-bread-crumb";
import { Headings } from "./headings";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

/* -------------------- TYPES -------------------- */
interface FormMockInterviewProps {
  initialData: Interview | null;
}

/* -------------------- ZOD SCHEMA -------------------- */
/**
 * IMPORTANT:
 * - HTML number inputs return strings
 * - z.preprocess safely converts string -> number
 * - This avoids `unknown` in strict builds
 */
const formSchema = z.object({
  position: z.string().min(1, "Position is required"),
  description: z.string().min(10, "Description is required"),
  experience: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Experience cannot be negative")
  ),
  techStack: z.string().min(1, "Tech stack is required"),
});

type FormData = z.infer<typeof formSchema>;

const FormMockInterview = ({ initialData }: FormMockInterviewProps) => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);

  /* -------------------- FORM -------------------- */
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: "",
      description: "",
      experience: 0,
      techStack: "",
      ...initialData,
    },
  });

  const { isSubmitting, isValid } = form.formState;

  /* -------------------- AI -------------------- */
  const generateAiResponse = async (data: FormData) => {
    try {
      const prompt = `
You are an experienced technical interviewer.

Generate exactly 5 interview questions with detailed answers.

STRICT RULES:
- Output must be a valid JSON array
- No markdown
- No extra text
- Each item must have "question" and "answer"

FORMAT:
[
  { "question": "Question text", "answer": "Answer text" }
]

JOB DETAILS:
Role: ${data.position}
Description: ${data.description}
Experience: ${data.experience} years
Tech Stack: ${data.techStack}

Return ONLY the JSON array.
`;

      const result = await chatSession.sendMessage(prompt);
      const text = result.response.text();

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Invalid AI response");

      return JSON.parse(match[0]);
    } catch {
      // Fallback so app NEVER crashes
      return [
        {
          question: `What is ${data.techStack}?`,
          answer: `${data.techStack} is commonly used in modern applications.`,
        },
      ];
    }
  };

  /* -------------------- SUBMIT -------------------- */
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

        toast("Updated!", {
          description: "Mock interview updated successfully.",
        });
      } else {
        await addDoc(collection(db, "interviews"), {
          ...data,
          userId,
          questions,
          createdAt: serverTimestamp(),
        });

        toast("Created!", {
          description: "Mock interview created successfully.",
        });
      }

      navigate("/generate", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- RESET ON EDIT -------------------- */
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

  /* -------------------- UI -------------------- */
  return (
    <div className="w-full flex-col space-y-4">
      <CustomBreadCrumb
        breadCrumbPage={initialData ? initialData.position : "Create"}
        breadCrumpItems={[{ label: "Mock Interviews", link: "/generate" }]}
      />

      <div className="mt-4 flex items-center justify-between">
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

      {/* ✅ SHADCN FORM */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-8 flex flex-col gap-6 shadow-md rounded-lg"
        >
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Position</FormLabel>
                <FormControl>
                  <Input {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
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
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience (Years)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="techStack"
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

          <div className="flex justify-end gap-4">
            <Button type="reset" variant="outline">
              Reset
            </Button>
            <Button type="submit" disabled={!isValid || loading || isSubmitting}>
              {loading ? <Loader className="animate-spin" /> : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default FormMockInterview;
