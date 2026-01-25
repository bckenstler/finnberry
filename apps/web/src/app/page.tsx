import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to <span className="text-primary">Finnberry</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            The simple, beautiful way to track your baby&apos;s sleep, feeding,
            diapers, and more. Share with caregivers and get insights powered by AI.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/login">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl">
            <FeatureCard
              title="Sleep Tracking"
              description="Timer-based tracking for naps and night sleep with quality ratings"
            />
            <FeatureCard
              title="Feeding Log"
              description="Track breastfeeding, bottles, and solid foods with ease"
            />
            <FeatureCard
              title="Multi-Caregiver"
              description="Share with family and caregivers with real-time sync"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border bg-card">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
