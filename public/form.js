
document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formEncuesta");
    const mensaje = document.getElementById("mensaje");

    if (!formulario) {
        console.error(
            'No se encontró el formulario con id="formEncuesta". Revisa form.html.'
        );
        return;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const botonEnviar = formulario.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (botonEnviar) {
            botonEnviar.disabled = true;
        }

        if (mensaje) {
            mensaje.textContent = "Enviando respuestas...";
            mensaje.classList.remove("error");
        }

        try {
            const formularioDatos = new FormData(formulario);
            const datos = Object.fromEntries(formularioDatos.entries());

            // Convertir los campos numéricos.
            if (datos.vasos_agua !== undefined) {
                datos.vasos_agua = Number(datos.vasos_agua);
            }

            if (datos.horas_sueno !== undefined) {
                datos.horas_sueno = Number(datos.horas_sueno);
            }

            // Enviar la encuesta conservando la cookie de sesión.
            const respuesta = await fetch("/api/respuestas", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datos)
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                if (respuesta.status === 401) {
                    throw new Error(
                        "Tu sesión no está activa. Regresa al inicio, registra tus datos y vuelve a entrar a la encuesta."
                    );
                }

                if (respuesta.status === 409) {
                    throw new Error(
                        resultado.error ||
                        "Este participante ya respondió la encuesta."
                    );
                }

                if (respuesta.status === 400) {
                    const faltantes = resultado.camposFaltantes?.join(", ");

                    throw new Error(
                        faltantes
                            ? `${resultado.error} Revisa: ${faltantes}.`
                            : resultado.error || "Revisa las respuestas ingresadas."
                    );
                }

                throw new Error(
                    resultado.error || "No se pudieron guardar las respuestas."
                );
            }

            if (mensaje) {
                mensaje.textContent = "¡Encuesta enviada correctamente!";
                mensaje.classList.remove("error");
            }

            formulario.reset();

        } catch (error) {
            console.error("Error enviando la encuesta:", error);

            if (mensaje) {
                mensaje.textContent = error.message;
                mensaje.classList.add("error");
            } else {
                alert(error.message);
            }
        } finally {
            if (botonEnviar) {
                botonEnviar.disabled = false;
            }
        }
    });
});
