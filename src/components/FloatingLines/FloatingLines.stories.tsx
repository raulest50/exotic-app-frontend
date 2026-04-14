import type { Story, StoryDefault } from '@ladle/react';
import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Input,
  Link,
  Text,
} from '@chakra-ui/react';

import BorderGlow from '../BorderGlow/BorderGlow.tsx';
import FloatingLines, { type FloatingLinesProps } from './FloatingLines.tsx';
import { loginFloatingLinesPreset } from './presets.ts';

const componentStoryArgs: FloatingLinesProps = {
  ...loginFloatingLinesPreset,
  interactive: true,
  parallax: true,
};

export default {
  title: 'Backgrounds/FloatingLines',
} satisfies StoryDefault<FloatingLinesProps>;

export const Component: Story<FloatingLinesProps> = args => (
  <Box
    position="relative"
    minH="100vh"
    overflow="hidden"
    borderRadius="32px"
    bg="#f3f7fa"
    backgroundImage="
      radial-gradient(circle at top left, rgba(36, 74, 115, 0.09), transparent 32%),
      radial-gradient(circle at top right, rgba(79, 140, 149, 0.08), transparent 28%),
      linear-gradient(180deg, #fbfcfd 0%, #f1f6f8 45%, #e7eff3 100%)
    "
  >
    <Box position="absolute" inset={0} opacity={0.92}>
      <FloatingLines {...args} />
    </Box>
    <Flex
      position="relative"
      zIndex={1}
      minH="100vh"
      px={{ base: 6, md: 12 }}
      py={{ base: 10, md: 16 }}
      align="flex-start"
      pointerEvents="none"
    >
      <Box maxW="lg">
        <Heading size="xl" color="gray.800">
          FloatingLines
        </Heading>
        <Text mt={4} fontSize="lg" color="gray.600">
          Usa los controles para ajustar contraste, velocidad y comportamiento del shader sobre un fondo claro.
        </Text>
      </Box>
    </Flex>
  </Box>
);

Component.args = componentStoryArgs;
Component.argTypes = {
  lineBoost: {
    control: { type: 'range', min: 0.4, max: 1.8, step: 0.05 },
  },
  lineOpacity: {
    control: { type: 'range', min: 0.2, max: 1, step: 0.02 },
  },
  animationSpeed: {
    control: { type: 'range', min: 0.2, max: 2, step: 0.1 },
  },
  interactive: {
    control: { type: 'boolean' },
  },
  parallax: {
    control: { type: 'boolean' },
  },
};

export const LoginBackground = () => (
  <Box
    position="relative"
    minH="100vh"
    overflow="hidden"
    bg="#f3f7fa"
    backgroundImage="
      radial-gradient(circle at top left, rgba(36, 74, 115, 0.09), transparent 32%),
      radial-gradient(circle at top right, rgba(79, 140, 149, 0.08), transparent 28%),
      linear-gradient(180deg, #fbfcfd 0%, #f1f6f8 45%, #e7eff3 100%)
    "
  >
    <Box position="absolute" inset={0} pointerEvents="none" opacity={0.92}>
      <FloatingLines {...loginFloatingLinesPreset} />
    </Box>
    <Container position="relative" zIndex={1} minH="100vh" minW={['auto', 'container.md', 'container.md']}>
      <Flex align="flex-start" justify="center" minH="100%" pt={{ base: 8, md: 12 }} pb={8} w="full">
        <Box w="100%" minH={['70vh', '75vh', '78vh']} display="flex" flexDirection="column">
          <BorderGlow
            backgroundColor="rgb(255 255 255 / 75%)"
            borderRadius={40}
            borderWidth={3}
            glowColor="40 92 72"
            colors={['#c084fc', '#f472b6', '#38bdf8']}
            glowIntensity={2}
            fillOpacity={0.78}
            glowRadius={88}
            edgeSensitivity={7}
            coneSpread={25}
            style={{ flex: 1, width: '100%', minWidth: 0 }}
          >
            <Flex direction="column" gap={7} p={{ base: 8, md: '4em' }} alignItems="center" justifyContent="flex-start" flex={1}>
              <Box boxSize="16.8rem">
                <Image src="/logo_exotic.svg" alt="Exotic logo" />
              </Box>
              <Heading size="lg">Login Panel</Heading>
              <FormControl isRequired>
                <FormLabel>Usuario</FormLabel>
                <Input placeholder="username" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Contrasena</FormLabel>
                <Input placeholder="password" type="password" />
              </FormControl>
              <Button colorScheme="blue" w="full">
                Login
              </Button>
              <Link color="blue.500" href="#">
                Olvido su contrasena?
              </Link>
            </Flex>
          </BorderGlow>
        </Box>
      </Flex>
    </Container>
  </Box>
);
