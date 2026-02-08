import type { Interview } from "@/types";
import { useNavigate } from "react-router";
import { deleteDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

import {
  Card,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { TooltipButton } from "./tooltip-button";
import { Eye, Newspaper, Sparkles, Trash2 } from "lucide-react";
import { db } from "@/config/firebase.config";

interface InterviewPinProps {
  interview: Interview;
  onMockPage?: boolean;
}

const InterviewPin = ({ interview, onMockPage = false }: InterviewPinProps) => {
  const navigate = useNavigate();

  /* ---------------- DELETE HANDLER ---------------- */

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this interview?"
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "interviews", interview.id));
      toast.success("Interview deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete interview");
    }
  };

  return (
    <Card className="p-4 rounded-md shadow-none hover:shadow-md shadow-gray-100 cursor-pointer transition-all space-y-4">
      <CardTitle className="text-lg">{interview.position}</CardTitle>
      <CardDescription>{interview.description}</CardDescription>

      <div className="w-full flex items-center gap-2 flex-wrap">
        {interview.techStack.split(",").map((word, index) => (
          <Badge
            key={index}
            variant="outline"
            className="text-xs text-muted-foreground hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900"
          >
            {word.trim()}
          </Badge>
        ))}
      </div>

      <CardFooter
        className={cn(
          "w-full flex items-center p-0",
          onMockPage ? "justify-end" : "justify-between"
        )}
      >
        <p className="text-[12px] text-muted-foreground truncate whitespace-nowrap">
          {`${new Date(interview.createdAt.toDate()).toLocaleDateString(
            "en-US",
            { dateStyle: "long" }
          )} - ${new Date(interview.createdAt.toDate()).toLocaleTimeString(
            "en-US",
            { timeStyle: "short" }
          )}`}
        </p>

        {!onMockPage && (
          <div className="flex items-center justify-center">
            <TooltipButton
              content="View"
              buttonVariant="ghost"
              onClick={() =>
                navigate(`/generate/${interview.id}`, { replace: true })
              }
              disbaled={false}
              buttonClassName="hover:text-sky-500"
              icon={<Eye />}
              loading={false}
            />

            <TooltipButton
              content="Feedback"
              buttonVariant="ghost"
              onClick={() =>
                navigate(`/generate/feedback/${interview.id}`, {
                  replace: true,
                })
              }
              disbaled={false}
              buttonClassName="hover:text-yellow-500"
              icon={<Newspaper />}
              loading={false}
            />

            <TooltipButton
              content="Start"
              buttonVariant="ghost"
              onClick={() =>
                navigate(`/generate/interview/${interview.id}`, {
                  replace: true,
                })
              }
              disbaled={false}
              buttonClassName="hover:text-sky-500"
              icon={<Sparkles />}
              loading={false}
            />

            {/* 🔥 DELETE BUTTON */}
            <TooltipButton
              content="Delete"
              buttonVariant="ghost"
              onClick={handleDelete}
              disbaled={false}
              buttonClassName="hover:text-red-500"
              icon={<Trash2 />}
              loading={false}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default InterviewPin;
