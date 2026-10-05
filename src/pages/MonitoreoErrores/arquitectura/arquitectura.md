# Arquitectura del modulo. 

## Intencion:

Poder recopilar de manera automatica la ocurrecia de un error en la aplicacion,
si necesidad de que el usuario lo reporte, y recopilar toda la informacion necesaria
para saber la causa del error. 
Recopilar:
  + modulo y tab donde ocurre el error
  + hora exacta con fecha
  + usuario
  + payloads involucrados
  + console prints de frontend y backend spring relacionados con el error
  + entidades relacionadas y sus id's
  + files involucrados tanto en frontend como en backend.
  + otra informacion que pueda ser relevante para la intencion pero que no caigo en cuenta 
  de especificar

## Entidades
    + GrupoError.java : Agrupa varios errores de un mismo tipo
    + EventoError.java : Documenta la ocurrencia de un error

## Archivos
    + ErrorHandler.ts


## Estrategia
    Me parece que debe de haber una clase ErrorHandler dentro del page de Monitoreo de Errores en el front,
    la idea es que esta clase encapsule los metodos y datos necesarios para reportar el error al backend.
    debe tener un metedo de construir EventoError unicamente, pero vacio y que tenga las anotaciones necesarias para 
    que sea obligacion de cada modulo hacer su implementacion personalizada de este metodo. lo que importa es que
    defina que entrega un EventoError. y debe ser responsabilidad del backend determinar a que GrupoError Pertenece o
    si debe crear uno nuevo.
