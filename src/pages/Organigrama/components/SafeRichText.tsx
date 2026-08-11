import { useMemo } from "react";
import { Box, BoxProps } from "@chakra-ui/react";
import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "ul", "ol", "li", "a"];
const ALLOWED_ALIGNMENTS = new Set(["left", "center", "right", "justify"]);
const ALLOWED_LINK = /^(https?:|mailto:)/i;

export function sanitizeRichHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "rel", "style"],
    ALLOW_DATA_ATTR: false,
  });

  const template = document.createElement("template");
  template.innerHTML = sanitized;

  template.content.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    const textAlign = element.style.textAlign.toLowerCase();
    element.removeAttribute("style");
    if (element.tagName === "P" && ALLOWED_ALIGNMENTS.has(textAlign)) {
      element.style.textAlign = textAlign;
    }
  });

  template.content.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
    const href = link.getAttribute("href")?.trim() ?? "";
    if (!ALLOWED_LINK.test(href)) {
      link.removeAttribute("href");
    }
    link.setAttribute("rel", "nofollow noopener noreferrer");
  });

  return template.innerHTML;
}

export function richTextHasContent(html: string): boolean {
  const template = document.createElement("template");
  template.innerHTML = sanitizeRichHtml(html);
  return (template.content.textContent ?? "").replace(/\u00a0/g, " ").trim().length > 0;
}

interface SafeRichTextProps extends BoxProps {
  html: string;
}

export default function SafeRichText({ html, css, ...boxProps }: SafeRichTextProps) {
  const safeHtml = useMemo(() => sanitizeRichHtml(html), [html]);

  return (
    <Box
      {...boxProps}
      css={{
        "& p": { mb: 3 },
        "& p:last-of-type": { mb: 0 },
        "& ul, & ol": { pl: 6, mb: 3 },
        "& a": { color: "blue.500", textDecoration: "underline" },
        ...css,
      }}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
