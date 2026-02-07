import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Loader, Trash2 } from "lucide-react";

import type { Interview } from "@/types";
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

import { chatSession } from "@/scripts";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";

/* -------------------- TYPES & SCHEMA -------------------- */

interface FormMockInterviewProps {
  initialData: Interview | null;
}

const formSchema = z.object({
  position: z
    .string()
    .min(1, "Position is required")
    .max(100, "Position must be 100 characters or less"),
  description: z.string().min(10, "Description is required"),
  experience: z.coerce.number().min(0, "Experience cannot be negative"),
  techStack: z.string().min(1, "Tech stack is required"),
});

type FormData = z.infer<typeof formSchema>;

/* -------------------- COMPONENT -------------------- */

const FormMockInterview = ({ initialData }: FormMockInterviewProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: "",
      description: "",
      experience: 0,
      techStack: "",
      ...initialData,
    },
  });

  const { isValid, isSubmitting } = form.formState;
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();

  const title = initialData?.position ?? "Create a new Mock Interview";
  const breadCrumpPage = initialData?.position ?? "Create";
  const actions = initialData ? "Save Changes" : "Create";

  const toastMessage = initialData
    ? { title: "Updated!", description: "Changes saved successfully." }
    : { title: "Created!", description: "New Mock Interview created." };

  /* -------------------- AI RESPONSE CLEANER -------------------- */
  const cleanAiResponse = (text: string) => {
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      return JSON.parse(match[0]);
    } catch (error) {
      console.error("AI JSON parse failed:", error);
      return [];
    }
  };

  /* -------------------- AI GENERATION -------------------- */
  const generateAiResponse = async (data: FormData) => {
    try {
      const prompt = `
You are an experienced technical interviewer.

Generate exactly 5 interview questions with detailed answers.

STRICT RULES:
- Output must be a valid JSON array
- No markdown
- No headings
- No explanation text outside JSON
- Each item must contain "question" and "answer"

FORMAT:
[
  {
    "question": "Question text",
    "answer": "Detailed answer text"
  }
]

JOB DETAILS:
- Job Role: ${data.position}
- Job Description: ${data.description}
- Years of Experience: ${data.experience}
- Tech Stack: ${data.techStack}

QUESTION REQUIREMENTS:
- 2 questions on core concepts of ${data.techStack}
- 1 question on real-world problem solving
- 1 question on best practices
- 1 question based on experience level (${data.experience} years)

Return ONLY the JSON array.
`;

      const aiResults = await chatSession.sendMessage(prompt);
      const text = aiResults.response.text();
      const parsed = cleanAiResponse(text);

      if (!parsed.length) {
        throw new Error("Empty AI response");
      }

      return parsed;
    } catch (error) {
      console.warn("AI failed, using fallback questions.");

      return [
        {
          question: `Explain ${data.techStack}.`,
          answer: `${data.techStack} is widely used in modern application development to build scalable and efficient systems.`,
        },
        {
          question: `What are your responsibilities as a ${data.position}?`,
          answer: `As a ${data.position}, I am responsible for designing, developing, testing, and maintaining applications.`,
        },
        {
          question: `How do you solve real-world problems in projects?`,
          answer: `I analyze requirements, break the problem into smaller tasks, and implement solutions step by step.`,
        },
        {
          question: `What best practices do you follow while working with ${data.techStack}?`,
          answer: `I follow clean code principles, proper error handling, performance optimization, and documentation.`,
        },
        {
          question: `How does your ${data.experience} years of experience help you?`,
          answer: `My experience helps me anticipate edge cases, write efficient code, and make better technical decisions.`,
        },
      ];
    }
  };

  /* -------------------- SUBMIT HANDLER -------------------- */
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const aiResult = await generateAiResponse(data);

      if (initialData) {
        await updateDoc(doc(db, "interviews", initialData.id), {
          ...data,
          questions: aiResult,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "interviews"), {
          ...data,
          userId,
          questions: aiResult,
          createdAt: serverTimestamp(),
        });
      }

      toast(toastMessage.title, { description: toastMessage.description });
      navigate("/generate", { replace: true });
    } catch (error: any) {
      console.error("SUBMIT ERROR:", error);
      toast.error("Error", {
        description: error.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- EFFECT -------------------- */
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
        breadCrumbPage={breadCrumpPage}
        breadCrumpItems={[{ label: "Mock Interviews", link: "/generate" }]}
      />

      <div className="mt-4 flex items-center justify-between w-full">
        <Headings title={title} isSubHeading />
        {initialData && (
          <Button size="icon" variant="ghost">
            <Trash2 className="min-w-4 min-h-4 text-red-500" />
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full p-8 rounded-lg flex flex-col gap-6 shadow-md"
        >
          {/* Position */}
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Role / Position</FormLabel>
                <FormControl>
                  <Input {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Description</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Experience */}
          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Years of Experience</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={loading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tech Stack */}
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
            <Button type="reset" variant="outline" disabled={loading}>
              Reset
            </Button>
            <Button type="submit" disabled={!isValid || loading || isSubmitting}>
              {loading ? <Loader className="animate-spin" /> : actions}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default FormMockInterview;
