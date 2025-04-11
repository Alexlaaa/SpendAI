import Hero from "@/components/shared/Hero";
import Trusted from "@/components/shared/Trusted";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Hero />
      <Trusted />
    </main>
  );
}
