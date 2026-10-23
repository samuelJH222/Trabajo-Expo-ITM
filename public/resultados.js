
const mensaje = document.getElementById("mensaje");

const graficas = {};

function crearGrafica(id, tipo, etiquetas, valores, titulo) {
    if (graficas[id]) {
        graficas[id].destroy();
    }

    graficas[id] = new Chart(document.getElementById(id), {
        type: tipo,
        data: {
            labels: etiquetas,
            datasets: [{
                label: titulo,
                data: valores,
                backgroundColor: [
                    "#159e9e",
                    "#62c7bd",
                    "#91b8e8",
                    "#f0c674",
                    "#e99caa",
                    "#a89be8"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: tipo === "doughnut" || tipo === "pie"
                }
            },
            scales: tipo === "bar" ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            } : {}
        }
    });
}

function contarValores(respuestas, campo, ordenarNumeros = false) {
    const conteo = {};

    respuestas.forEach(respuesta => {
        const valor = respuesta[campo];

        if (valor !== null && valor !== undefined && valor !== "") {
            const etiqueta = String(valor);
            conteo[etiqueta] = (conteo[etiqueta] || 0) + 1;
        }
    });

    let etiquetas = Object.keys(conteo);

    if (ordenarNumeros) {
        etiquetas.sort((a, b) => Number(a) - Number(b));
    }

    return {
        etiquetas,
        valores: etiquetas.map(etiqueta => conteo[etiqueta])
    };
}

async function cargarResultados() {
    try {
        const respuesta = await fetch("/api/encuestas");

        if (!respuesta.ok) {
            throw new Error("No se pudieron consultar los resultados.");
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error("La API no devolvió una lista de resultados.");
        }

        const participantes = new Set(
            datos
                .map(item => item.participante_id ?? item.id)
                .filter(id => id !== null && id !== undefined)
        );

        document.getElementById("totalParticipantes").textContent =
            participantes.size;

        document.getElementById("totalRespuestas").textContent =
            datos.filter(item =>
                item.vasos_agua !== null &&
                item.vasos_agua !== undefined
            ).length;

        const agua = contarValores(datos, "vasos_agua", true);
        const actividad = contarValores(datos, "actividad_fisica");
        const sueno = contarValores(datos, "horas_sueno", true);
        const alimentacion = contarValores(datos, "alimentacion");

        crearGrafica(
            "graficaAgua", "bar",
            agua.etiquetas, agua.valores,
            "Número de participantes"
        );

        crearGrafica(
            "graficaActividad", "doughnut",
            actividad.etiquetas, actividad.valores,
            "Participantes"
        );

        crearGrafica(
            "graficaSueno", "bar",
            sueno.etiquetas, sueno.valores,
            "Número de participantes"
        );

        crearGrafica(
            "graficaAlimentacion", "pie",
            alimentacion.etiquetas, alimentacion.valores,
            "Participantes"
        );

        mensaje.textContent = datos.length
            ? "Resultados actualizados correctamente."
            : "Todavía no hay respuestas registradas.";

    } catch (error) {
        console.error("Error al cargar resultados:", error);
        mensaje.textContent =
            "No se pudieron cargar los resultados. Revisa el servidor.";
    }
}

cargarResultados();
