import { InstrumentoEvaluacion } from '../types';

export const instrumentosEvaluacion: Record<string, InstrumentoEvaluacion> = {
    "examen": {
      "id": "examen",
      "nombre": "Examen",
      "descripcion": "Pruebas teóricas escritas para evaluar conocimientos.",
      "pesoTotal": 40,
      "activities": [
        {
          "id": "act-1",
          "name": "Examen 1",
          "trimester": "t1"
        },
        {
          "id": "act-2",
          "name": "Examen 2",
          "trimester": "t1"
        },
        {
          "id": "act-8",
          "name": "Examen 3",
          "trimester": "t2"
        },
        {
          "id": "act-9",
          "name": "Examen 4",
          "trimester": "t2"
        }
      ]
    },
    "servicios": {
      "id": "servicios",
      "nombre": "Servicios",
      "descripcion": "Evaluación del desempeño durante los servicios prácticos de restaurante.",
      "pesoTotal": 30,
      "activities": [
        {
          "id": "act-6",
          "name": "Servicios 1",
          "trimester": "t1"
        },
        {
          "id": "act-13",
          "name": "Servicios 2",
          "trimester": "t2"
        }
      ]
    },
    "ex_practico": {
      "id": "ex_practico",
      "nombre": "Ex. Practico",
      "descripcion": "Exámenes prácticos de elaboración y técnicas culinarias.",
      "pesoTotal": 30,
      "activities": [
        {
          "id": "act-7",
          "name": "Ex. Practico 1",
          "trimester": "t1"
        },
        {
          "id": "act-14",
          "name": "Ex. Practico 2",
          "trimester": "t2"
        }
      ]
    }
  };
