import { Box, Heading, Text } from "@chakra-ui/react";
import { LuArrowUpRight, LuMessageCircle, LuMousePointer2, LuSparkles } from "react-icons/lu";
import { AgentAssistant } from "./AgentAssistant";
import type { AgentAssistantProps } from "./AgentAssistant";
import { ExoticMascot } from "./ExoticMascot";
import styles from "./AgentAssistant.module.css";

/** Isolated visual workspace; intentionally not mounted in the application router. */
export function AgentAssistantPreview({ initialState = "open", canWrite = false }: AgentAssistantProps) {
    return (
        <Box as="main" className={styles.stage}>
            <Box as="header" className={styles.stageHeader}>
                <Text className={styles.stageBadge}>Exotic · estudio de personaje</Text>
                <Heading as="h1" className={styles.stageTitle}>Un poco de ayuda,<br /><Box as="span" color="#711449" _dark={{ color: "pink.200" }}>a tu lado.</Box></Heading>
                <Text className={styles.stageCopy}>Una cara conocida para conversar con la información de Exotic. Pequeño cuando estás trabajando, presente cuando lo necesitas.</Text>
            </Box>

            <Box className={styles.sampleGrid}>
                <Box as="section" className={styles.sampleCard} aria-labelledby="mascot-preview-title">
                    <Text className={styles.eyebrow}>El personaje</Text>
                    <ExoticMascot decorative={false} title="Mascota Exotic: envase de acondicionador con ojos, manos y pies" />
                    <Heading as="h2" id="mascot-preview-title" fontSize="lg" fontWeight="600">La esencia del envase.</Heading>
                    <Text color="fg.muted" fontSize="sm" lineHeight="1.8" mt="2">Tapa oscura, curvas azules y Exotic como protagonista. Una sonrisa y un pequeño saludo para darle vida.</Text>
                    <Box display="flex" gap="2" mt="5" aria-label="Paleta: azul, borgoña y perla">
                        {['#145feb', '#711449', '#f6f1e7', '#182435'].map((color) => <Box key={color} bg={color} boxSize="6" rounded="full" borderWidth="1px" borderColor="border" aria-hidden="true" />)}
                    </Box>
                </Box>

                <Box as="section" className={styles.sampleCard} aria-labelledby="assistant-preview-title">
                    <Text className={styles.eyebrow}>Tu espacio de trabajo</Text>
                    <Heading as="h2" id="assistant-preview-title" fontSize="2xl" fontWeight="600" mb="5">Aparece cuando lo necesitas.</Heading>
                    <Box display="grid" gap="6">
                        {[
                            { icon: LuMessageCircle, title: 'Una pregunta, para empezar', copy: 'Abre el panel y escribe, o toma una de las preguntas de ejemplo.' },
                            { icon: LuMousePointer2, title: 'Siempre te deja espacio', copy: 'Minimiza la conversación para conservar solo el personaje. Ocúltalo para despejar la pantalla.' },
                            { icon: LuSparkles, title: 'Movimiento con calma', copy: 'Un parpadeo ocasional y un saludo al acercarte. Respeta tu preferencia de movimiento reducido.' },
                        ].map(({ icon: Icon, title, copy }) => (
                            <Box key={title} display="flex" gap="4" alignItems="flex-start">
                                <Box p="2.5" rounded="xl" bg="bg.muted" color="#711449" _dark={{ color: "pink.200" }}><Icon size={19} aria-hidden="true" /></Box>
                                <Box><Heading as="h3" fontSize="sm" fontWeight="600" mb="1">{title}</Heading><Text color="fg.muted" fontSize="sm" lineHeight="1.8">{copy}</Text></Box>
                            </Box>
                        ))}
                    </Box>
                    <Box mt="7" pt="5" borderTopWidth="1px" borderColor="border" display="flex" alignItems="center" gap="2" color="fg.muted" fontSize="xs">
                        <LuArrowUpRight aria-hidden="true" /> Vista previa visual · consultas aún no disponibles
                    </Box>
                </Box>
            </Box>
            <AgentAssistant initialState={initialState} canWrite={canWrite} />
        </Box>
    );
}
