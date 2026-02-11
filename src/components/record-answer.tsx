import { useAuth } from "@clerk/clerk-react";
import {
  CircleStop,
  Loader,
  Mic,
  RefreshCw,
  Save,
  Video,
  VideoOff,
  WebcamIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSpeechToText, { type ResultType } from "react-hook-speech-to-text";
import { useParams } from "react-router";
import Webcam from "react-webcam";
import { TooltipButton } from "./tooltip-button";
import { toast } from "sonner";
import { SaveModal } from "./save-model";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { generateWithGemini } from "@/scripts";

/* ---------------- TYPES ---------------- */

interface RecordAnswerProps {
  question: { question: string; answer: string };
  isWebCam: boolean;
  setIsWebCam: (value: boolean) => void;
}

interface AIResponse {
  ratings: number;
  feedback: string;
}

/* ---------------- COMPONENT ---------------- */

const RecordAnswer = ({
  question,
  isWebCam,
  setIsWebCam,
}: RecordAnswerProps) => {
  /* ---------- SPEECH TO TEXT ---------- */
  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  /* ---------- STATE ---------- */
  const [userAnswer, setUserAnswer] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { userId } = useAuth();
  const { interviewId } = useParams();

  /* ---------------- RECORD ANSWER ---------------- */

  const recordUserAnswer = async () => {
    if (isRecording) {
      stopSpeechToText();

      if (userAnswer.trim().length < 15) {
        toast.error("Answer too short", {
          description: "Your answer should be at least 15 characters.",
        });
        return;
      }

      const result = await generateResult(
        question.question,
        question.answer,
        userAnswer
      );

      setAiResult(result);
    } else {
      startSpeechToText();
    }
  };

  /* ---------------- AI EVALUATION ---------------- */

  const generateResult = async (
    qst: string,
    correctAns: string,
    userAns: string
  ): Promise<AIResponse> => {
    setIsAiGenerating(true);

    try {
      const prompt = `
Evaluate the user's interview answer.

STRICT FORMAT (no extra text):
Rating: <number from 1 to 10>
Feedback: <2–3 lines constructive feedback>

Question: ${qst}
Correct Answer: ${correctAns}
User Answer: ${userAns}
`;

      const text = await generateWithGemini(prompt);

      console.log("RAW AI FEEDBACK >>>", text);

      const ratingMatch = text.match(/Rating:\s*(\d+)/i);
      const feedbackMatch = text.match(/Feedback:\s*([\s\S]*)/i);

      return {
        ratings: ratingMatch ? Number(ratingMatch[1]) : 0,
        feedback: feedbackMatch
          ? feedbackMatch[1].trim()
          : "No feedback generated.",
      };
    } catch (error) {
      console.error("AI evaluation failed ❌", error);
      toast.error("AI evaluation failed");

      return {
        ratings: 0,
        feedback: "Unable to generate feedback.",
      };
    } finally {
      setIsAiGenerating(false);
    }
  };

  /* ---------------- RECORD AGAIN ---------------- */

  const recordNewAnswer = () => {
    setUserAnswer("");
    setAiResult(null);
    stopSpeechToText();
    startSpeechToText();
  };

  /* ---------------- SAVE ANSWER ---------------- */

  const saveUserAnswer = async () => {
    if (!aiResult) return;

    setLoading(true);

    try {
      const q = query(
        collection(db, "userAnswers"),
        where("userId", "==", userId),
        where("question", "==", question.question)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        toast.info("Already answered", {
          description: "You have already answered this question.",
        });
        return;
      }

      await addDoc(collection(db, "userAnswers"), {
        mockIdRef: interviewId,
        question: question.question,
        correct_ans: question.answer,
        user_ans: userAnswer,
        feedback: aiResult.feedback,
        rating: aiResult.ratings,
        userId,
        createdAt: serverTimestamp(),
      });

      toast.success("Answer saved successfully");
      setUserAnswer("");
      stopSpeechToText();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save answer");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  /* ---------------- LIVE TRANSCRIPT ---------------- */

  useEffect(() => {
    const combined = results
      .filter((r): r is ResultType => typeof r !== "string")
      .map((r) => r.transcript)
      .join(" ");

    setUserAnswer(combined);
  }, [results]);

  /* ---------------- UI ---------------- */

  return (
    <div className="w-full flex flex-col items-center gap-8 mt-4">
      <SaveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={saveUserAnswer}
        loading={loading}
      />

      <div className="w-full h-[400px] md:w-96 flex items-center justify-center border bg-gray-50 rounded-md">
        {isWebCam ? (
          <Webcam className="w-full h-full object-cover rounded-md" />
        ) : (
          <WebcamIcon className="min-w-24 min-h-24 text-muted-foreground" />
        )}
      </div>

      <div className="flex gap-3">
        <TooltipButton
          content={isWebCam ? "Turn Off" : "Turn On"}
          icon={isWebCam ? <VideoOff /> : <Video />}
          onClick={() => setIsWebCam(!isWebCam)}
        />

        <TooltipButton
          content={isRecording ? "Stop Recording" : "Start Recording"}
          icon={isRecording ? <CircleStop /> : <Mic />}
          onClick={recordUserAnswer}
        />

        <TooltipButton
          content="Record Again"
          icon={<RefreshCw />}
          onClick={recordNewAnswer}
        />

        <TooltipButton
          content="Save Result"
          icon={
            isAiGenerating ? (
              <Loader className="animate-spin" />
            ) : (
              <Save />
            )
          }
          onClick={() => setOpen(true)}
          disbaled={!aiResult}
        />
      </div>

      <div className="w-full p-4 border rounded-md bg-gray-50">
        <h2 className="font-semibold">Your Answer:</h2>

        <p className="mt-2 text-sm text-gray-700">
          {userAnswer || "Start recording to see your answer here"}
        </p>

        {interimResult && (
          <p className="text-xs text-gray-500 mt-2">
            <strong>Current Speech:</strong> {interimResult}
          </p>
        )}
      </div>
    </div>
  );
};

export default RecordAnswer;
