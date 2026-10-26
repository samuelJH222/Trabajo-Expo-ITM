
const mensaje = document.getElementById("mensajeResultados");
const contador = document.getElementById("totalParticipantes");

const colores = [
    "#287b54",
    "#10b981",
    "#85c99c",
    "#b7e4c7",
    "#f4c95d",
    "#f28c66",
    "#6b8afd",
    "#a78bfa",
    "#e879a9",
    "#64b5cd"
];

const coloresFrecuencia = {
    nunca: "#e87979",
    a_veces: "#f4c95d",
    frecuentemente: "#64b5cd",
    siempre: "#287b54"
};

// Mostrar 0 mientras se consultan los datos.
if (contador) {
    contador.textContent = "0";
}

function normalizarEtiqueta(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "Sin respuesta";
    }

    const texto = String(valor).trim();
    const clave = texto.toLowerCase();

    const etiquetas = {
        nunca: "Nunca",
        a_veces: "A veces",
        "a veces": "A veces",
        frecuentemente: "Frecuentemente",
        siempre: "Siempre",
        si: "Sí",
        "sí": "Sí",
        no: "No"
    };

    return etiquetas[clave] || texto;
}

function contarRespuestas(respuestas, campo) {
    const conteo = {};

    respuestas.forEach((respuesta) => {
        const valor = respuesta[campo];

        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return;
        }

        const etiqueta = normalizarEtiqueta(valor);

        conteo[etiqueta] = (conteo[etiqueta] || 0) + 1;
    });

    return conteo;
}

function obtenerDatos(conteo) {
    return {
        labels: Object.keys(conteo),
        valores: Object.values(conteo)
    };
}

function opcionesGenerales() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: "circle"
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const valor = context.parsed;

                        const total = context.dataset.data.reduce(
                            (suma, numero) => suma + numero,
                            0
                        );

                        const porcentaje = total
                            ? ((valor / total) * 100).toFixed(1)
                            : "0.0";

                        return ` ${context.label}: ${valor} (${porcentaje}%)`;
                    }
                }
            }
        }
    };
}

// Gráficas circulares.
function crearGraficaPastel(id, respuestas, campo) {
    const canvas = document.getElementById(id);

    if (!canvas) {
        console.warn(`No se encontró el canvas: ${id}`);
        return;
    }

    const datos = obtenerDatos(
        contarRespuestas(respuestas, campo)
    );

    new Chart(canvas, {
        type: "pie",
        data: {
            labels: datos.labels,
            datasets: [{
                data: datos.valores,
                backgroundColor: colores,
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: opcionesGenerales()
    });
}

// Gráficas de barras para los ocho hábitos.
function crearGraficaBarras(id, respuestas, campo) {
    const canvas = document.getElementById(id);

    if (!canvas) {
        console.warn(`No se encontró el canvas: ${id}`);
        return;
    }

    const frecuencias = [
        "nunca",
        "a_veces",
        "frecuentemente",
        "siempre"
    ];

    const etiquetasFrecuencia = {
        nunca: "Nunca",
        a_veces: "A veces",
        frecuentemente: "Frecuentemente",
        siempre: "Siempre"
    };

    const conteo = contarRespuestas(respuestas, campo);
    const etiquetas = [];
    const valores = [];
    const fondos = [];

    frecuencias.forEach((frecuencia) => {
        const etiqueta = etiquetasFrecuencia[frecuencia];

        if (conteo[etiqueta] !== undefined) {
            etiquetas.push(etiqueta);
            valores.push(conteo[etiqueta]);
            fondos.push(coloresFrecuencia[frecuencia]);
        }
    });

    // Incluye otros valores que no estén entre las cuatro frecuencias.
    Object.keys(conteo).forEach((etiqueta) => {
        if (!etiquetas.includes(etiqueta)) {
            etiquetas.push(etiqueta);
            valores.push(conteo[etiqueta]);
            fondos.push("#85c99c");
        }
    });

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Número de personas",
                data: valores,
                backgroundColor: fondos,
                borderRadius: 7,
                maxBarThickness: 55
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            ` Personas: ${context.parsed.y}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: "Número de personas"
                    },
                    grid: {
                        color: "#e8efe9"
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

// Consultar el número total de participantes registrados.
async function cargarTotalParticipantes() {
    try {
        const respuesta = await fetch("/api/participantes/total");

        if (!respuesta.ok) {
            throw new Error("No se pudo consultar el total.");
        }

        const datos = await respuesta.json();
        const total = Number(datos.total);

        if (!Number.isInteger(total) || total < 0) {
            throw new Error("El total recibido no es válido.");
        }

        if (contador) {
            contador.textContent = String(total);
        }
    } catch (error) {
        console.error("Error contando participantes:", error);

        // Evita mostrar rayas si falla la consulta.
        if (contador) {
            contador.textContent = "0";
        }
    }
}

// Consultar respuestas y crear todas las gráficas.
async function cargarResultados() {
    try {
        if (mensaje) {
            mensaje.textContent = "Cargando resultados...";
            mensaje.classList.remove("error");
        }

        const respuesta = await fetch("/api/respuestas");

        if (!respuesta.ok) {
            throw new Error("No se pudieron consultar las respuestas.");
        }

        const resultados = await respuesta.json();

        if (!Array.isArray(resultados)) {
            throw new Error("El servidor no devolvió una lista de respuestas.");
        }

        if (mensaje) {
            mensaje.textContent = resultados.length === 0
                ? "Todavía no hay respuestas registradas."
                : `Se encontraron ${resultados.length} respuestas registradas.`;
        }

        // Cuatro gráficas circulares.
        crearGraficaPastel("graficaAgua", resultados, "vasos_agua");
        crearGraficaPastel("graficaActividad", resultados, "actividad_fisica");
        crearGraficaPastel("graficaSueno", resultados, "horas_sueno");
        crearGraficaPastel("graficaAlimentacion", resultados, "alimentacion");

        // Ocho gráficas de hábitos.
        crearGraficaBarras("graficaFruta", resultados, "fruta");
        crearGraficaBarras("graficaActividadHabitual", resultados, "actividad_habitual");
        crearGraficaBarras("graficaManos", resultados, "lavado_manos");
        crearGraficaBarras("graficaSuenoRegular", resultados, "sueno_regular");
        crearGraficaBarras("graficaRopa", resultados, "ropa_dia");
        crearGraficaBarras("graficaUtensilios", resultados, "utensilios_limpieza");
        crearGraficaBarras("graficaBebidas", resultados, "bebidas_azucaradas");
        crearGraficaBarras("graficaCelular", resultados, "celular_antes_dormir");

    } catch (error) {
        console.error("Error cargando los resultados:", error);

        if (mensaje) {
            mensaje.textContent =
                "No se pudieron cargar los resultados. Revisa la conexión con el servidor.";
            mensaje.classList.add("error");
        }
    }
}

// Ejecutar las dos consultas por separado.
cargarTotalParticipantes();
cargarResultados();
