import { Container } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader";

export default function AdministracionAlertasPage() {
    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Administración de Alertas" />
            {/* Add your content here */}
            <p>Página de Administración de Alertas</p>
        </Container>
    );
}