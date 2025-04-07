"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const Trusted = () => {
    let [logos, setLogos] = useState([
        [
            {
                title: "netflix",
                src: "/logos/netflix.png",
            },
            {
                title: "meta",
                src: "/logos/meta.png",
            },
            {
                title: "google",
                src: "/logos/google.webp",
            },
            {
                title: "vercel",
                src: "/logos/vercel.png",
            },
        ],
        [
            {
                title: "netflix second",
                src: "/logos/netflix.png",
            },
            {
                title: "meta second",
                src: "/logos/meta.png",
            },
            {
                title: "google second",
                src: "/logos/google.webp",
            },
            {
                title: "vercel second",
                src: "/logos/vercel.png",
            },
        ],
    ]);
    const [activeLogoSet, setActiveLogoSet] = useState(logos[0]);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);

    const flipLogos = () => {
        setLogos((currentLogos) => {
            const newLogos = [...currentLogos.slice(1), currentLogos[0]];
            setActiveLogoSet(newLogos[0]);
            setIsAnimating(true);
            return newLogos;
        });
    };

    useEffect(() => {
        if (!isAnimating) {
            const timer = setTimeout(() => {
                flipLogos();
            }, 3000);
            return () => clearTimeout(timer); // Clear timeout if component unmounts or isAnimating changes
        }
    }, [isAnimating]);

    return (
        <div className="relative z-20 py-10 md:py-40">
            <h1 className="font-medium text-black text-3xl md:text-5xl md:leading-tight max-w-5xl mx-auto text-center tracking-tight">Built With Latest Models</h1>
            <h2 className="text-center">
                backed by AI models used in top companies.
            </h2>

            <div className="flex gap-10 flex-wrap justify-center md:gap-40 relative h-full w-full mt-20">
                <AnimatePresence
                    mode="popLayout"
                    onExitComplete={() => {
                        setIsAnimating(false);
                    }}
                >
                    {activeLogoSet.map((logo, idx) => (
                        <motion.div
                            initial={{
                                y: 40,
                                opacity: 0,
                                filter: "blur(10px)",
                            }}
                            animate={{
                                y: 0,
                                opacity: 1,
                                filter: "blur(0px)",
                            }}
                            exit={{
                                y: -40,
                                opacity: 0,
                                filter: "blur(10px)",
                            }}
                            transition={{
                                duration: 0.8,
                                delay: 0.1 * idx,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                            key={logo.title}
                            className="relative"
                        >
                            <Image
                                src={logo.src}
                                alt={logo.title}
                                width="100"
                                height="100"
                                className="md:h-20 md:w-40 h-10 w-20 object-contain filter"
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Trusted;