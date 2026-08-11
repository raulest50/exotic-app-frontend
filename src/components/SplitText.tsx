// src/components/SplitText.tsx
import { Text, TextProps } from "@chakra-ui/react";
import { motion } from "framer-motion";

interface SplitTextProps extends TextProps {
    /** Text to display */
    text: string;
    /** Split type: characters or words */
    type?: "characters" | "words";
    /** Delay between each item animation in seconds */
    delay?: number;
    /** Duration of each animation in seconds */
    duration?: number;
}

export default function SplitText({
    text,
    type = "characters",
    delay = 0.05,
    duration = 0.4,
    ...rest
}: SplitTextProps) {
    const parts = type === "words" ? text.split(" ") : Array.from(text);

    return (
        <Text as="h3" fontSize="xl" fontFamily="Comfortaa Variable" display="inline-block" {...rest}>
            {parts.map((part, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0, y: "0.25em" }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration, delay: index * delay }}
                    style={{ display: "inline-block" }}
                >
                    {part}
                    {type === "words" && index < parts.length - 1 ? " " : ""}
                </motion.span>
            ))}
        </Text>
    );
}
