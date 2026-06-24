import { type Dispatch, type SetStateAction } from "react";
import {IngresoOCM_DTA, OrdenCompra, TipoEntidadCausante} from "../../types.tsx";
import {
    Button,
    Divider,
    Flex,
    Heading,
    Icon,
    IconButton,
    Text,
} from "@chakra-ui/react";
import { MdAddAPhoto } from "react-icons/md";
import { FaFolderOpen } from "react-icons/fa";
import { FaFileCircleQuestion } from "react-icons/fa6";

import { useAuth } from '../../../../context/AuthContext';

interface StepTwoComponentProps {
    setActiveStep: (step: number) => void;
    orden: OrdenCompra | null;
    setIngresoOCM_DTA: Dispatch<SetStateAction<IngresoOCM_DTA | null>>;
}

export default function IngresoOCMStep2UploadDocument({
                                             setActiveStep,
                                             orden,
                                             setIngresoOCM_DTA,
                                         }: StepTwoComponentProps) {

    const { meProfile: currentUser } = useAuth();

    // El soporte queda deshabilitado temporalmente; el usuario lo gestiona por fuera de la app.
    const onClickContinuar = async () => {
        setIngresoOCM_DTA(prevState => {
            if (!prevState) {
                return {
                    transaccionAlmacen: {
                        movimientosTransaccion: [],
                        urlDocSoporte: "",
                        tipoEntidadCausante: TipoEntidadCausante.OCM,
                        idEntidadCausante: orden?.ordenCompraId?.toString() || "",
                        observaciones: ""
                    },
                    ordenCompraMateriales: orden!,
                    userId: currentUser?.id.toString(),
                    observaciones: "",
                };
            }

            return {
                ...prevState,
                userId: currentUser?.id.toString(),
            };
        });

        setActiveStep(3);

    };

    return (
        <Flex
            p="1em"
            direction="column"
            backgroundColor="app.stepperBlue"
            gap={8}
            alignItems="center"
        >
            <Heading fontFamily="Comfortaa Variable">
                Adjuntar Documento Soporte
            </Heading>

            <Text fontFamily="Comfortaa Variable">
                El documento soporte es opcional para este ingreso.
            </Text>
            <Text fontFamily="Comfortaa Variable">
                Por ahora se guarda fuera de la app; puede continuar sin adjuntar archivo.
            </Text>
            <Divider />
            <Flex
                direction="row"
                gap="10em"
                p="1em"
                justifyContent="center"
                w="full"
            >
                <IconButton
                    colorScheme="teal"
                    icon={<FaFolderOpen />}
                    aria-label="Buscar Archivo"
                    fontSize="5em"
                    w="2em"
                    h="2em"
                    isDisabled
                />
                <IconButton
                    colorScheme="teal"
                    icon={<MdAddAPhoto />}
                    aria-label="Tomar una Foto"
                    fontSize="5em"
                    w="2em"
                    h="2em"
                    isDisabled
                />
            </Flex>

            <Divider />

            <Flex
                direction="row"
                gap="1em"
                p="1em"
                justifyContent="center"
                w="full"
            >
                <Icon
                    as={FaFileCircleQuestion}
                    boxSize="4em"
                    color="orange.500"
                />
                <Text fontFamily="Comfortaa Variable">
                    Carga de soporte deshabilitada temporalmente. El ingreso puede continuar.
                </Text>
            </Flex>

            <Button
                colorScheme="teal"
                variant="solid"
                onClick={onClickContinuar}
            >
                Continuar
            </Button>
        </Flex>
    );
}
