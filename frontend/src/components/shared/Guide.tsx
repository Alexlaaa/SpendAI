"use client";

import React, { useRef } from "react";
import { MotionValue, motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { VideoModal } from "@/components/shared/VideoModal";

export default function Guide() {

  const containerRef = useRef<any>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1.2];
  };

  const rotate = useTransform(scrollYProgress, [0, 0.2], [15, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, 100]);
  return (
    <div
      ref={containerRef}
      className="flex flex-col min-h-[70rem] md:min-h-[100rem] pt-20 relative overflow-hidden"
    >
        <h1 className="font-medium text-black text-3xl md:text-5xl md:leading-tight max-w-5xl mx-auto text-center tracking-tight pb-20">Check out our Demo!</h1>

      <div className="flex  items-center justify-center relative p-2 md:p-20 cursor-pointer md:-mt-20">
        <div
          className="w-full relative"
          style={{
            perspective: "1000px",
          }}
        >
          <Card rotate={rotate} translate={translate} scale={scale}>
            <Image
              src={`/images/demoImage.png`}
              alt="dashboard"
              height={720}
              width={1500}
              className="mx-auto rounded-md grayscale group-hover:grayscale-0 transition duration-200 object-cover object-left-top h-full  md:object-left-top"
              draggable={false}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export const Card = ({
  rotate,
  scale,
  translate,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        translateY: translate,
      }}
      className="max-w-6xl z-40 group -mt-12 mx-auto isolate group h-[20rem] md:h-[50rem] w-full border-4 border-neutral-900 p-2 md:p-2 bg-charcoal rounded-[30px] shadow-2xl relative"
    >
      <div className="absolute h-40 w-full bottom-0 md:-bottom-10 inset-x-0 scale-[1.2] z-20 pointer-events-none bg-charcoal [mask-image:linear-gradient(to_top,white_30%,transparent)]" />
      <div className="absolute inset-0 z-20  bg-transparent group-hover:bg-black/0 transition-all duration-200 flex items-center justify-center">
        <VideoModal />
      </div>
      <div className=" h-full w-full  overflow-hidden rounded-2xl bg-transparent md:rounded-2xl md:p-4 ">
        {children}
      </div>
    </motion.div>
  );
};
