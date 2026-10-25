
const formulario = document.getElementById("formIngreso");
const mensaje = document.getElementById("mensaje");
const boton = formulario.querySelector("button");
console.log("¡app.js se está ejecutando!");
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
console.log("Formulario interceptado correctamente");
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("email").value.trim();
    localStorage.setItem("correoParticipante", correo);

    mensaje.textContent = "";
    boton.disabled = true;

    try {
        const correo = localStorage.getItem("correoParticipante");
        const nombre = correo ? correo.split("@")[0] : "";
        const respuesta = await fetch("/api/participantes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nombre, correo })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mensaje.textContent = datos.mensaje || "No se pudo completar el registro.";
            return;
        }

        window.location.href = datos.continuar;
    } catch (error) {
        console.error("Error al registrar participante:", error);
        mensaje.textContent = "No se pudo conectar con el servidor.";
    } finally {
        boton.disabled = false;
    }
});
