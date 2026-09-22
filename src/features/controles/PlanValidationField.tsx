import { Field } from "@chakra-ui/react";
import type { ComponentProps } from "react";
import type { PlanValidationIssue } from "./planValidation";

export default function PlanValidationField({ field, issues, children, ...props }: ComponentProps<typeof Field.Root> & {
    field: string;
    issues: PlanValidationIssue[];
}) {
    const messages = issues.filter((issue) => issue.field === field);
    return (
        <Field.Root {...props} invalid={messages.length > 0} data-plan-field={field} tabIndex={-1}>
            {children}
            {messages.length > 0 && <Field.ErrorText>{[...new Set(messages.map((issue) => issue.message))].join(" ")}</Field.ErrorText>}
        </Field.Root>
    );
}
