import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Headings } from "@/components/headings";
import InterviewPin from "@/components/pin";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/config/firebase.config";
import type { Interview } from "@/types";

const Dashboard = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    const interviewQuery = query(
      collection(db, "interviews"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      interviewQuery,
      (snapshot) => {
        const interviewList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Interview[];

        setInterviews(interviewList);
        setLoading(false);
      },
      (error) => {
        console.error("Fetch error:", error);
        toast.error("Something went wrong. Try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Headings
          title="Dashboard"
          description="Create and start your AI Mock Interview"
        />
        <Link to="/generate/create">
          <Button size="sm">
            <Plus className="mr-1" />
            Add New
          </Button>
        </Link>
      </div>

      <Separator className="my-8" />

      <div className="md:grid md:grid-cols-3 gap-3 py-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 md:h-32 rounded-md" />
          ))
        ) : interviews.length > 0 ? (
          interviews.map((interview) => (
            <InterviewPin key={interview.id} interview={interview} />
          ))
        ) : (
          <div className="md:col-span-3 w-full flex flex-col items-center justify-center h-96">
            <img
              src="/assets/svg/not-found.svg"
              className="w-44 h-44 object-contain"
              alt="No data"
            />
            <h2 className="text-lg font-semibold text-muted-foreground">
              No Data Found
            </h2>
            <p className="text-sm text-neutral-400 mt-4 text-center max-w-md">
              There is no available data to show. Please add some new mock
              interviews.
            </p>
            <Link to="/generate/create" className="mt-4">
              <Button size="sm">
                <Plus className="mr-1" />
                Add New
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
