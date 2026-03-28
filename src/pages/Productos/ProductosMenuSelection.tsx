import { Card, CardBody, CardHeader, Flex, Heading, Icon, SimpleGrid, Text } from '@chakra-ui/react';
import { FaTools, FaBoxOpen, FaCogs } from 'react-icons/fa';
import { Modulo } from '../Usuarios/GestionUsuarios/types.tsx';
import { moduleAccessRule } from '../../auth/accessHelpers.ts';
import { useAccessSnapshot } from '../../auth/usePermissions.ts';
import type { AccessRule } from '../../auth/accessModel.ts';

interface Props {
    setViewMode: (mode: 'menu' | 'basic' | 'terminados' | 'procesos') => void;
}

type MenuCardDef = {
    key: string;
    title: string;
    description: string;
    icon: typeof FaTools;
    bg: string;
    hoverBg: string;
    activeBg: string;
    onClick: () => void;
    accesoValido: AccessRule;
};

export function ProductosMenuSelection({ setViewMode }: Props) {
    const access = useAccessSnapshot();

    const cards: MenuCardDef[] = [
        {
            key: 'basic',
            title: 'Basic Operations',
            description: 'Codificar material y consultar productos',
            icon: FaTools,
            bg: 'orange.100',
            hoverBg: 'orange.300',
            activeBg: 'orange.800',
            onClick: () => setViewMode('basic'),
            accesoValido: moduleAccessRule(Modulo.PRODUCTOS, 1),
        },
        {
            key: 'terminados',
            title: 'Definicion Terminados/Semiterminados',
            description: 'Gestionar terminados, semiterminados y categorias',
            icon: FaBoxOpen,
            bg: 'teal.100',
            hoverBg: 'teal.300',
            activeBg: 'teal.800',
            onClick: () => setViewMode('terminados'),
            accesoValido: moduleAccessRule(Modulo.PRODUCTOS, 1),
        },
        {
            key: 'procesos',
            title: 'Definicion de Procesos',
            description: 'Definir procesos de produccion',
            icon: FaCogs,
            bg: 'purple.100',
            hoverBg: 'purple.300',
            activeBg: 'purple.800',
            onClick: () => setViewMode('procesos'),
            accesoValido: moduleAccessRule(Modulo.PRODUCTOS, 2),
        },
    ];

    const visibleCards = cards.filter((card) => card.accesoValido(access));

    return (
        <Flex direction={"column"} gap={10} w="full">
            <Heading as="h2" size="lg" textAlign="center" mb={6} fontFamily="Arimo">
                Seleccione una opcion
            </Heading>

            <SimpleGrid columns={3} spacing={8} w="full">
                {visibleCards.map((card) => (
                    <Card
                        key={card.key}
                        h="250px"
                        cursor="pointer"
                        bg={card.bg}
                        _hover={{
                            bg: card.hoverBg,
                            transform: "translateY(-5px)",
                            boxShadow: "xl",
                        }}
                        _active={{ bg: card.activeBg, color: "white" }}
                        transition="all 0.3s ease"
                        onClick={card.onClick}
                    >
                        <CardHeader borderBottom="0.1em solid" p={4}>
                            <Heading as="h3" size="md" fontFamily="Comfortaa Variable">
                                {card.title}
                            </Heading>
                        </CardHeader>
                        <CardBody display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                            <Icon as={card.icon} boxSize="5em" mb={4} />
                            <Text textAlign="center">{card.description}</Text>
                        </CardBody>
                    </Card>
                ))}
            </SimpleGrid>
        </Flex>
    );
}

export default ProductosMenuSelection;
