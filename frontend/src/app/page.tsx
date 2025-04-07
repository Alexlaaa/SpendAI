import Hero from "@/components/shared/Hero"
import Trusted from "@/components/shared/Trusted"
import Guide from "@/components/shared/Guide"

export default function Home() {
  return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
          <Hero />
          <Trusted />
          <Guide />
      </main>
  );
}
