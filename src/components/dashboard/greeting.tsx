"use client";

import { useSession } from "next-auth/react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Greeting() {
  const { data: session } = useSession();
  const name = session?.user?.name || session?.user?.email?.split("@")[0] || "there";
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {greeting}, {name}
      </h1>
      <p className="text-muted-foreground mt-1">{today}</p>
    </div>
  );
}
