import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ContainerProps{
    children: ReactNode,
    className?: string
}


const Container = ({children, className}: ContainerProps) => {
  return (
    <div className={cn("container mx-auto px-4 md:px-8 py-4 w-full", className)}>
      {children}
    </div>
  )
}

export default Container;
