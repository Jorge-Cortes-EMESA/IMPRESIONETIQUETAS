// ... (inicio de script.js: getUrlParameter, deepClone) ...

const DEFAULT_CONFIG = {
    labelWidthCm: 10,
    labelHeightCm: 3.5, // Esta altura es bastante restrictiva para dos QRs grandes y texto
    dpi: 600,
    fontFamily: 'Arial, sans-serif',
    labelText: { // Para "MATRICULA" y "MATERIAL"
        baseFontSize: 28, // Un poco más pequeño para que quepa bien arriba
        fontWeight: "bold", // Hacemos los labels en negrita
        color: "#000000"
    },
    codeContentText: { // Para el valor de la matrícula y el material debajo de los labels
        baseFontSize: 30, // Tamaño para los valores
        fontWeight: "normal",
        color: "#000000"
    },
    elements: {
        // --- Sección Izquierda: MATRICULA y su QR ---
        matriculaLabel: { type: 'text', text: "MATRICULA",
            xPercent: 0.25, yPercent: 0.05, // Más arriba, centrado en su cuarto
            textAlign: 'center', textBaseline: 'top' },
        matriculaQRValue: { type: 'text', // Valor de la matrícula
            xPercent: 0.25, yPercent: 0.18, // Debajo del label "MATRICULA"
            textAlign: 'center', textBaseline: 'top' },
        matriculaQrCode: { type: 'qr', // CAMBIADO de qrCode a matriculaQrCode
            sizePercentHeight: 0.60, // Porcentaje del alto de la etiqueta, intentamos maximizar
                                     // Considerando que hay texto arriba y potencialmente abajo.
                                     // Si es 0.60, y el texto de arriba ocupa ~0.25, queda poco abajo.
            xPercent: 0.25, yPercent: 0.35, // Posición Y del QR, debajo del texto del valor
            anchor: 'center-top',
            color: "#000000" },

        // --- Sección Central: ELIMINADA O REUBICADA ---
        // Por ahora la eliminamos para dar espacio a los QRs
        // cantidadLabel: { ... },
        // cantidadValue: { ... },
        // fechaLabel:    { ... },
        // fechaValue:    { ... },

        // --- Sección Derecha: MATERIAL y su QR ---
        materialLabel:  { type: 'text', text: "MATERIAL",
            xPercent: 0.75, yPercent: 0.05, // Más arriba, centrado en su cuarto
            textAlign: 'center', textBaseline: 'top' },
        materialValueText: { type: 'text', // NUEVO: para mostrar el valor del material
            xPercent: 0.75, yPercent: 0.18, // Debajo del label "MATERIAL"
            textAlign: 'center', textBaseline: 'top' },
        materialQrCode: { type: 'qr', // CAMBIADO de barcode a materialQrCode y tipo 'qr'
            sizePercentHeight: 0.60, // Mismo tamaño que el otro QR
            xPercent: 0.75, yPercent: 0.35, // Misma Posición Y del QR
            anchor: 'center-top',
            color: "#000000" }
        // materialBarcodeValue ya no se usa, ahora es materialValueText
    }
};

let previewCanvas, previewCtx;

function setTextContent(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
}

async function handlePreviewLabel() {
    const previewBtn = document.getElementById('preview-label-btn');
    if (previewBtn) previewBtn.disabled = true;

    const statusDiv = document.getElementById('label-generation-status');
    statusDiv.textContent = "Actualizando previsualización...";
    statusDiv.className = 'mb-3 text-center text-muted';

    const matricula = document.getElementById('input-matricula').value || "MATRICULA_EJ";
    const cantidad = document.getElementById('input-cantidad').value || "CANT_EJ"; // Lo guardamos por si se quiere usar en el futuro
    const material = document.getElementById('input-material').value || "MATERIAL_EJ";
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Pasamos todos los datos, aunque no todos se usen en este layout
    const labelData = { matricula, cantidad, material, fecha };
    const configToDraw = deepClone(DEFAULT_CONFIG);

    try {
        await drawOrGenerateLabel(labelData, configToDraw, previewCanvas, previewCtx, false);
        statusDiv.textContent = "Previsualización actualizada.";
        statusDiv.className = 'mb-3 text-center text-success';
    } catch (error) {
        console.error("Error updating preview:", error);
        statusDiv.textContent = "Error previsualización: " + error.message;
        statusDiv.className = 'mb-3 text-center text-danger';
    } finally {
        if (previewBtn) previewBtn.disabled = false;
        setTimeout(() => {
            if(statusDiv.classList.contains('text-success')) {
                statusDiv.textContent = '';
                statusDiv.className = 'mb-3 text-center';
            }
        }, 2000);
    }
}

async function drawOrGenerateLabel(labelData, config, targetCanvas, targetCtx, isFinalGeneration = false) {
    return new Promise(async (resolve, reject) => {
        try {
            const labelWidthPx = (config.labelWidthCm * CM_TO_INCH) * config.dpi;
            const labelHeightPx = (config.labelHeightCm * CM_TO_INCH) * config.dpi;

            targetCanvas.width = labelWidthPx;
            targetCanvas.height = labelHeightPx;

            if (!isFinalGeneration) {
                const previewPanel = targetCanvas.parentElement;
                let maxWidth = previewPanel.clientWidth - 40;
                let maxHeight = previewPanel.clientHeight - 40;
                const previewScale = Math.min(maxWidth / labelWidthPx, maxHeight / labelHeightPx, 1);
                targetCanvas.style.width = (labelWidthPx * previewScale) + "px";
                targetCanvas.style.height = (labelHeightPx * previewScale) + "px";
            } else {
                targetCanvas.style.width = ""; targetCanvas.style.height = "";
            }

            targetCtx.clearRect(0, 0, labelWidthPx, labelHeightPx);
            targetCtx.fillStyle = "white";
            targetCtx.fillRect(0, 0, labelWidthPx, labelHeightPx);

            const getScaledFontSize = (baseFontSize) => Math.max(5, baseFontSize * (labelWidthPx / 1000));

            for (const key in config.elements) {
                const elConfig = config.elements[key];
                if (elConfig.visible === false) continue;

                let elX = (elConfig.xPercent || 0) * labelWidthPx;
                let elY = (elConfig.yPercent || 0) * labelHeightPx;

                if (elConfig.type === 'text') {
                    let textToDraw = "";
                    let currentFontConfig = {};

                    if (key.includes("Label")) { // "matriculaLabel", "materialLabel"
                        textToDraw = elConfig.text;
                        currentFontConfig = config.labelText;
                    } else if (key === 'matriculaQRValue') {
                        textToDraw = labelData.matricula;
                        currentFontConfig = config.codeContentText;
                    } else if (key === 'materialValueText') { // Ajustado el nombre
                        textToDraw = labelData.material;
                        currentFontConfig = config.codeContentText;
                    }
                    // Los antiguos cantidadValue y fechaValue ya no están en DEFAULT_CONFIG.elements

                    if (textToDraw) { // Solo dibujar si hay texto
                        targetCtx.font = `${currentFontConfig.fontWeight || "normal"} ${getScaledFontSize(currentFontConfig.baseFontSize)}px ${config.fontFamily}`;
                        targetCtx.fillStyle = currentFontConfig.color || "#000000";
                        targetCtx.textAlign = elConfig.textAlign || 'left';
                        targetCtx.textBaseline = elConfig.textBaseline || 'alphabetic';
                        targetCtx.fillText(textToDraw, elX, elY);
                    }

                } else if (elConfig.type === 'qr') { // Ahora tenemos dos: matriculaQrCode y materialQrCode
                    let qrSize = elConfig.sizePercentHeight * labelHeightPx;
                    let drawXqr = elX;
                    let drawYqr = elY;
                    
                    let qrData = "";
                    if (key === 'matriculaQrCode') {
                        qrData = labelData.matricula;
                    } else if (key === 'materialQrCode') {
                        qrData = labelData.material;
                    }

                    if (elConfig.anchor === 'center-top') {
                       drawXqr = elX - qrSize / 2;
                    } else if (elConfig.anchor === 'left-top') {
                       // elX, elY son la esquina superior izquierda
                    } else { // Fallback a centrado por defecto
                        drawXqr = elX - qrSize / 2;
                        drawYqr = elY - qrSize / 2;
                    }

                    if (qrData) { // Solo generar QR si hay datos
                        const qrContainer = document.createElement('div');
                        try {
                            new QRCode(qrContainer, { text: qrData, width: Math.round(qrSize), height: Math.round(qrSize), colorDark: elConfig.color, colorLight: "#FFFFFF", correctLevel: QRCode.CorrectLevel.M });
                            if (isFinalGeneration && qrContainer.querySelector('canvas')) await new Promise(r => setTimeout(r, 30));
                            const qrCanvasEl = qrContainer.querySelector('canvas');
                            if (qrCanvasEl) targetCtx.drawImage(qrCanvasEl, drawXqr, drawYqr, qrSize, qrSize);
                        } catch (e) { console.warn(`Error QR para ${key}:`, e); targetCtx.strokeRect(drawXqr, drawYqr, qrSize, qrSize); }
                    }
                }
                // La sección 'barcode' ya no existe en DEFAULT_CONFIG.elements
            }
            if (isFinalGeneration) resolve(targetCanvas.toDataURL('image/png')); else resolve();
        } catch (error) {
            console.error("Error en drawOrGenerateLabel:", error);
            reject(error);
        }
    });
}

// ... (createLabelCanvas, handleGenerateAndDownload, downloadAllLabelsAsPdf) ...
// Asegúrate de que la función getUrlParameter esté al principio del script.

document.addEventListener('DOMContentLoaded', function() {
    previewCanvas = document.getElementById('label-preview-canvas');
    if (previewCanvas) previewCtx = previewCanvas.getContext('2d');
    else { console.error("Preview canvas not found!"); alert("Error: Canvas no encontrado."); return; }

    setTextContent('#label-generator-screen-title', "Impresión de Matrículas");

    const urlMatricula = getUrlParameter('matricula');
    const urlCantidad = getUrlParameter('cantidad');
    const urlMaterial = getUrlParameter('material');

    const inputMatricula = document.getElementById('input-matricula');
    const inputCantidad = document.getElementById('input-cantidad');
    const inputMaterial = document.getElementById('input-material');

    if (urlMatricula && inputMatricula) {
        inputMatricula.value = urlMatricula;
    }
    if (urlCantidad && inputCantidad) { // Aunque no se muestre, lo llenamos si viene por URL
        inputCantidad.value = urlCantidad;
    }
    if (urlMaterial && inputMaterial) {
        inputMaterial.value = urlMaterial;
    }
    
    handlePreviewLabel(); // Llamar después de intentar popular todos los inputs

    const initialScreen = document.getElementById(currentScreenId);
    if (initialScreen) {
         document.querySelectorAll('.screen-view').forEach(sv => { sv.classList.add('d-none'); sv.classList.remove('active', 'd-flex'); });
        initialScreen.classList.remove('d-none');
        initialScreen.classList.add('active', 'd-flex');
    }
});
