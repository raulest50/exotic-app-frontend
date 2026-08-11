import { Card, NativeSelect, Stack, Text, Field } from "@chakra-ui/react";
import { useState } from "react";
import HorasExtraBiPanel from "./HorasExtraBiPanel.tsx";

type PersonalBiView = "horas-extra";

export default function PersonalBiTab() {
    const [view, setView] = useState<PersonalBiView>("horas-extra");

    return (
        <Stack gap={4}>
            <Card.Root variant="outline">
                <Card.Body>
                    <Stack gap={4}>
                        <Text fontSize="lg" fontWeight="semibold">Personal</Text>
                        <Field.Root maxW={{ base: "full", md: "280px" }}>
                            <Field.Label>Vista</Field.Label>
                            <NativeSelect.Root>
                                <NativeSelect.Field
                                    value={view}
                                    onChange={(e) => setView(e.target.value as PersonalBiView)}>
                                    <option value="horas-extra">Horas extra</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                    </Stack>
                </Card.Body>
            </Card.Root>

            {view === "horas-extra" ? <HorasExtraBiPanel /> : null}
        </Stack>
    );
}
