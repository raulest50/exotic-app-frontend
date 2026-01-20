import { useState } from 'react';
import {
    Button,
    Divider,
    Flex,
    Heading,
    Text,
    useToast,
    VStack,
} from '@chakra-ui/react';

import { IncorporacionActivoDto } from '../../types.tsx';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { DocSuppUploader } from '../../../../components/DocSuppUploader/DocSuppUploader.tsx';

type Props = {
    setActiveStep: (step: number) => void;
    setIncorporacionActivoHeader: (incorporacionActivoDto: IncorporacionActivoDto) => void;
    incorporacionActivoDto: IncorporacionActivoDto;
};

export function ActivosFijosStep2UploadInvoice({
    setActiveStep,
    setIncorporacionActivoHeader,
    incorporacionActivoDto
}: Props) {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const toast = useToast();

    // When continuing, update the incorporacionActivoDto with the file and proceed
    const onClickContinuar = () => {
        if (!file) {
            toast({
                title: "No se ha seleccionado archivo",
                description: "Por favor seleccione o capture un archivo antes de continuar.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // Actualizar el incorporacionActivoDto existente con el archivo
        setIncorporacionActivoHeader({
            ...incorporacionActivoDto,
            documentoSoporte: file,
            userId: user?.toString(),
        });

        setActiveStep(3);
    };

    return (
        <Flex direction="column" gap={8} w="full">
            <VStack spacing={4} align="stretch" bg="blue.50" p={6} borderRadius="md">
                <Heading size="md" textAlign="center">
                    Adjuntar Documento Soporte
                </Heading>

                <Text textAlign="center">
                    Debe adjuntar un documento soporte (factura) para la incorporación de activos fijos.
                </Text>
                <Text textAlign="center">
                    El soporte lo puede adjuntar tomando una foto del documento físico
                    o adjuntando un scan del mismo.
                </Text>

                <Divider />

                <DocSuppUploader
                    title="Seleccionar factura o documento soporte"
                    description="Puede subir un archivo PDF o una imagen de la factura"
                    allowedExtensions={{
                        '.pdf': true,
                        '.jpg': true,
                        '.jpeg': true,
                        '.png': true
                    }}
                    setFile={setFile}
                />

                <Button
                    colorScheme="teal"
                    variant="solid"
                    onClick={onClickContinuar}
                    isDisabled={!file}
                    alignSelf="center"
                >
                    Continuar
                </Button>
            </VStack>
        </Flex>
    );
}
