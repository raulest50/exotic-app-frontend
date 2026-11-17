
import axios from 'axios';
import process from 'node:process';

// Define server URL
const server = "http://localhost:8080";

// Define endpoint for users
const ep_all_users = server + "/usuarios";
const ep_cargos = server + "/organigrama";

// Supply a local token when running this scratch script with Bun. Never use VITE_* for credentials.
const token = process.env.EXOTIC_SANDBOX_TOKEN;
if (!token || !token.trim()) {
    throw new Error("Define EXOTIC_SANDBOX_TOKEN en el entorno local antes de ejecutar sandbox.tsx.");
}

const headers = {
    'Authorization': `Bearer ${token}`
};


export interface Cargo {
    idCargo: string;
    tituloCargo: string;        // Título del cargo (será el mismo que el título del nodo)
    descripcionCargo: string;   // Descripción breve
    departamento: string;       // Departamento
    urlDocManualFunciones?: string; // url del pdf con el manual de funciones aprovado
    manualFuncionesFile?: File;  // Archivo del manual de funciones (solo en frontend)
    usuario?: string;           // Id Usuario asignado al cargo

    // Propiedades del nodo (anteriormente en CargoNodeData)
    posicionX: number;          // Posición X en el diagrama
    posicionY: number;          // Posición Y en el diagrama
    nivel: number;              // Nivel jerárquico
    jefeInmediato?: string;     // ID Nodo al que reporta
}


// Function to fetch and print all users
const getAllUsers = async () => {
  try {
    const response = await axios.get(ep_all_users, {headers});
    return response.data;
  } catch {
    throw new Error("No se pudo completar la consulta local del sandbox.");
  }
};

const getOrganigrama = async () => {
    try {
        const response = await axios.get(ep_cargos, {headers});
        return response.data;
    } catch {
        throw new Error("No se pudo completar la consulta local del sandbox.");
    }
};

// Call the function
const data = await getOrganigrama();

console.log(data);
