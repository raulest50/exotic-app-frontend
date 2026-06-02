import {
    Card,
    CardBody,
    FormControl,
    FormLabel,
    Select,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useState } from "react";
import HorasExtraBiPanel from "./HorasExtraBiPanel.tsx";

type PersonalBiView = "horas-extra";

export default function PersonalBiTab() {
    const [view, setView] = useState<PersonalBiView>("horas-extra");

    return (
        <Stack spacing={4}>
            <Card variant="outline">
                <CardBody>
                    <Stack spacing={4}>
                        <Text fontSize="lg" fontWeight="semibold">Personal</Text>
                        <FormControl maxW={{ base: "full", md: "280px" }}>
                            <FormLabel>Vista</FormLabel>
                            <Select value={view} onChange={(e) => setView(e.target.value as PersonalBiView)}>
                                <option value="horas-extra">Horas extra</option>
                            </Select>
                        </FormControl>
                    </Stack>
                </CardBody>
            </Card>

            {view === "horas-extra" ? <HorasExtraBiPanel /> : null}
        </Stack>
    );
}
