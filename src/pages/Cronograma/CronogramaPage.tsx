import { Container } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader";
import GanttDemo from "./GanttDemo";

export default function CronogramaPage() {
    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Cronograma" />
            <GanttDemo />
        </Container>
    );
}