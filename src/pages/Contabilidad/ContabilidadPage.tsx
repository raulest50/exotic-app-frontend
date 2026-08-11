import { Container, Flex, Box } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import CatalogoCuentas from "./cuentas/CatalogoCuentas";

export default function ContabilidadPage() {
    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <MyHeader title={'Contabilidad'} />
            <Flex direction="column" w="full" h="full">
                <Box>
                    <CatalogoCuentas />
                </Box>
            </Flex>
        </Container>
    );
}
