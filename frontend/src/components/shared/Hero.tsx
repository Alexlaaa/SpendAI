"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { heroHeading } from "@/constants";

const Hero = () => {
    return (
        <div className="flex flex-col min-h-screen pt-10 sm:pt-20 md:pt-40 relative overflow-hidden">
            <motion.h2
                initial={{
                    y: 40,
                    opacity: 0,
                }}
                animate={{
                    y: 0,
                    opacity: 1,
                }}
                transition={{
                    ease: "easeOut",
                    duration: 0.5,
                }}
                className="text-2xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 relative z-10 mb-4"
            >
                Welcome to SpendAI
            </motion.h2>
            <motion.h1
                initial={{
                    y: 40,
                    opacity: 0,
                }}
                animate={{
                    y: 0,
                    opacity: 1,
                }}
                transition={{
                    ease: "easeOut",
                    duration: 0.5,
                }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-semibold max-w-full sm:max-w-3xl md:max-w-6xl mx-auto text-center mt-4 sm:mt-6 relative z-10"
            >
                {heroHeading}
            </motion.h1>
            <motion.p
                initial={{
                    y: 40,
                    opacity: 0,
                }}
                animate={{
                    y: 0,
                    opacity: 1,
                }}
                transition={{
                    ease: "easeOut",
                    duration: 0.5,
                    delay: 0.2,
                }}
                className="text-center mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-muted-dark max-w-full sm:max-w-2xl md:max-w-3xl mx-auto relative z-10"
            >
                In a world of digital spending, make every receipt count. Our app turns your camera into a financial
                crystal ball. Snap a pic, and let our AI crunch the numbers, revealing spending trends, savings
                opportunities, and budget insights.
            </motion.p>
            <motion.div
                initial={{
                    y: 80,
                    opacity: 0,
                }}
                animate={{
                    y: 0,
                    opacity: 1,
                }}
                transition={{
                    ease: "easeOut",
                    duration: 0.5,
                    delay: 0.4,
                }}
                className="flex items-center gap-2 sm:gap-4 justify-center mt-4 sm:mt-6 relative z-10"
            >
                <Link href="/signin" passHref>
                    <Button
                        variant="outline"
                        className="flex space-x-2 items-center group"
                    >
                        <span>Get Started</span>
                        <ArrowRight />
                    </Button>
                </Link>
            </motion.div>
            <div
                className="p-2 sm:p-4 border border-neutral-400 rounded-[32px] mt-10 sm:mt-20 relative"
            >
                <div
                    className="absolute inset-x-0 bottom-0 h-20 sm:h-40 w-full bg-gradient-to-b from-transparent via-white to-white scale-[1.1] pointer-events-none"
                />
                <div
                    className="p-1 sm:p-2 bg-white border border-neutral-200 rounded-[24px]"
                >
                    <Image
                        src="/images/dashboard.png"
                        alt="header"
                        width={1920}
                        height={1080}
                        className="rounded-[20px] w-full object-cover"
                        priority={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default Hero;
