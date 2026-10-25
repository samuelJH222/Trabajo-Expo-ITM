/* 
const formulario = document.getElementById("formEncuesta");
const mensaje = document.getElementById("mensaje");
const boton = document.getElementById("botonEnviar");
const lugarSeleccionado = document.querySelector(
    'input[name="lugar_tiempo_libre"]:checked'
);


opcionesLugar.forEach(opcion => {
    opcion.addEventListener("change", () => {
        document.querySelectorAll(".lugar-card").forEach(tarjeta => {
            tarjeta.classList.remove("seleccionada");
        });

        opcion.closest(".lugar-card").classList.add("seleccionada");
    });
});


formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const respuestas = {
        agua: Number(document.getElementById("agua").value),
        ejercicio: document.getElementById("ejercicio").value,
        sueno: Number(document.getElementById("sueno").value),
        alimentacion: document.getElementById("alimentacion").value,
        lugar_tiempo_libre: lugarSeleccionado.value,
        nombre: nombre
        
    };

    mensaje.textContent = "";
    boton.disabled = true;

    try {
        const respuesta = await fetch("/api/respuestas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(respuestas)
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mensaje.textContent = datos.mensaje || "No se pudieron guardar las respuestas.";
            return;
        }

        mensaje.textContent = datos.mensaje;
        formulario.reset();
    } catch (error) {
        console.error(error);
        mensaje.textContent = "No se pudo conectar con el servidor.";
    } finally {
        boton.disabled = false;
    }
}); */

const formulario = document.getElementById("formEncuesta");
const mensaje = document.getElementById("mensaje");
const boton = document.getElementById("botonEnviar");

const opcionesLugar = document.querySelectorAll(
    'input[name="lugar_tiempo_libre"]'
);

// Resaltar visualmente la tarjeta seleccionada
opcionesLugar.forEach(opcion => {
    opcion.addEventListener("change", () => {
        document.querySelectorAll(".lugar-card").forEach(tarjeta => {
            tarjeta.classList.remove("seleccionada");
        });

        opcion.closest(".lugar-card").classList.add("seleccionada");
    });
});

// Enviar las respuestas de la encuesta
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    mensaje.textContent = "";

    // Obtener el lugar seleccionado al enviar el formulario
    const lugarSeleccionado = document.querySelector(
        'input[name="lugar_tiempo_libre"]:checked'
    );

    // Comprobar que se haya elegido un lugar
    if (!lugarSeleccionado) {
        mensaje.textContent = "Selecciona un lugar antes de continuar.";
        return;
    }

    // Recopilar las respuestas
    const respuestas = {
        agua: Number(document.getElementById("agua").value),
        ejercicio: document.getElementById("ejercicio").value,
        sueno: Number(document.getElementById("sueno").value),
        alimentacion: document.getElementById("alimentacion").value,
        lugar_tiempo_libre: lugarSeleccionado.value
    };

    boton.disabled = true;

    try {
        const respuesta = await fetch("/api/respuestas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(respuestas)
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mensaje.textContent =
                datos.mensaje || "No se pudieron guardar las respuestas.";
            return;
        }

        mensaje.textContent = datos.mensaje;
        formulario.reset();

        // Quitar el resaltado después de limpiar el formulario
        document.querySelectorAll(".lugar-card").forEach(tarjeta => {
            tarjeta.classList.remove("seleccionada");
        });

    } catch (error) {
        console.error(error);
        mensaje.textContent = "No se pudo conectar con el servidor.";
    } finally {
        boton.disabled = false;
    }
});