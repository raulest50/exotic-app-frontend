

import { Button, Input, Flex, HStack, Dialog, Portal } from "@chakra-ui/react";
  
  import {useState, useEffect} from "react";
  
  interface ModalConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
  }
  
  
  export default function ModalConfirmation({ isOpen, onClose }:ModalConfirmationProps) {
      
      
      const [confirmationNumber, setConfirmationNumber] = useState("");
      const [randomNum, setRandomNum] = useState(0);
      
      useEffect( () => {
        setRandomNum(Math.floor(10 + Math.random() * 90));
      }, [isOpen]);
      
      const onClickConfirmar = () => {
        if(Number(confirmationNumber) === randomNum){
          onClose();
          setConfirmationNumber("");
        } 
      };
      
      const closeWindow = () => {
        onClose();
        setConfirmationNumber("");
      }
    
      return (
        <>

          <Dialog.Root open={isOpen} onOpenChange={e => {
            if (!e.open) {
              onClose();
            }
          }}>
            <Portal>

              <Dialog.Backdrop />
              <Dialog.Positioner>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Ventana de Confirmacion</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.CloseTrigger />
                  <Dialog.Body p={'1em'}>
                    <Flex direction={'column'} gap={'1em'}>
                      <p>Para confirmar que esta seguro de hacer esta accion digite porfavor este numero: {randomNum}  y seleccione aceptar</p>
                      <Input
                        value={confirmationNumber}
                        onChange={ (e) => setConfirmationNumber(e.target.value)}
                      />
                    </Flex>
                    
                  </Dialog.Body>

                  <Dialog.Footer>
                    <HStack>
                      <Button colorPalette="blue" mr={3} onClick={closeWindow}>
                        Cancelar
                      </Button>
                      <Button variant="solid" colorPalette="orange"
                              onClick={onClickConfirmar}
                      > Confirmar
                      </Button>
                    </HStack>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Positioner>

            </Portal>
          </Dialog.Root>
        </>
      );
    }
