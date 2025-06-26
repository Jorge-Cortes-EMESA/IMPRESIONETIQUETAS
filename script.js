// Variables globales principales
let currentScreenId = 'screen-label-generator';
const CM_TO_INCH = 1 / 2.54;
let previewCanvas, previewCtx; // Se inicializarán en DOMContentLoaded

// Función para obtener parámetros de la URL
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Función para clonar objetos
function deepClone(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.error("Error en deepClone:", e, "Objeto:", obj);
        return {}; // Devolver objeto vacío en caso de error
    }
}

const DEFAULT_CONFIG = {
    labelWidthCm: 10,
    labelHeightCm: 3.5,
    dpi: 600,
    fontFamily: 'Arial, sans-serif',
    labelText: {
        baseFontSize: 26,
        fontWeight: "bold",
        color: "#000000"
    },
    codeContentText: {
        baseFontSize: 28,
        fontWeight: "normal",
        color: "#000000"
    },
    dynamicText: {
        baseFontSize: 28,
        fontWeight: "normal",
        color: "#000000"
    },
    elements: {
        matriculaLabel: { type: 'text', text: "MATRICULA",
            xPercent: 0.15, yPercent: 0.05,
            textAlign: 'center', textBaseline: 'top' },
        matriculaQRValue: { type: 'text',
            xPercent: 0.15, yPercent: 0.18,
            textAlign: 'center', textBaseline: 'top' },
        matriculaQrCode: { type: 'qr',
            sizePercentHeight: 0.55,
            xPercent: 0.15, yPercent: 0.35,
            anchor: 'center-top',
            color: "#000000" },
        cantidadLabel:  { type: 'text', text: "CANT.",
            xPercent: 0.50, yPercent: 0.05,
            textAlign: 'center', textBaseline: 'top' },
        cantidadValue:  { type: 'text',
            xPercent: 0.50, yPercent: 0.25,
            textAlign: 'center', textBaseline: 'top' },
        fechaLabel:     { type: 'text', text: "FECHA",
            xPercent: 0.50, yPercent: 0.50,
            textAlign: 'center', textBaseline: 'top' },
        fechaValue:     { type: 'text',
            xPercent: 0.50, yPercent: 0.70,
            textAlign: 'center', textBaseline: 'top' },
        materialLabel:  { type: 'text', text: "MATERIAL",
            xPercent: 0.85, yPercent: 0.05,
            textAlign: 'center', textBaseline: 'top' },
        materialValueText: { type: 'text',
            xPercent: 0.85, yPercent: 0.18,
            textAlign: 'center', textBaseline: 'top' },
        materialQrCode: { type: 'qr',
            sizePercentHeight: 0.55,
            xPercent: 0.85, yPercent: 0.35,
            anchor: 'center-top',
            color: "#000000" }
    }
};

function setTextContent(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = text;
    } else {
        console.warn(`setTextContent: Elemento no encontrado para selector '${selector}'`);
    }
}

async function drawOrGenerateLabel(labelData, config, targetCanvas, targetCtx, isFinalGeneration = false) {
    console.log("--- Iniciando drawOrGenerateLabel ---");
    if (!targetCanvas || !targetCtx) {
        console.error("Canvas o Contexto no definidos en drawOrGenerateLabel");
        return Promise.reject(new Error("Canvas o Contexto no definidos."));
    }
    if (!labelData || !config || !config.elements) { // Añadida comprobación para config.elements
        console.error("labelData, config o config.elements no definidos en drawOrGenerateLabel");
        return Promise.reject(new Error("Datos de entrada o configuración incompletos."));
    }

    console.log("labelData:", JSON.stringify(labelData));
    console.log("config (primer nivel):", { labelWidthCm: config.labelWidthCm, labelHeightCm: config.labelHeightCm, dpi: config.dpi, fontFamily: config.fontFamily });

    return new Promise(async (resolve, reject) => {
        try {
            const labelWidthPx = (config.labelWidthCm * CM_TO_INCH) * config.dpi;
            const labelHeightPx = (config.labelHeightCm * CM_TO_INCH) * config.dpi;
            console.log(`Dimensiones calculadas (px): ${labelWidthPx} x ${labelHeightPx}`);

            if (isNaN(labelWidthPx) || isNaN(labelHeightPx) || labelWidthPx <= 0 || labelHeightPx <= 0) {
                const errorMsg = `Dimensiones de etiqueta inválidas: ${labelWidthPx.toFixed(0)}x${labelHeightPx.toFixed(0)}px`;
                console.error(errorMsg);
                return reject(new Error(errorMsg));
            }

            targetCanvas.width = labelWidthPx;
            targetCanvas.height = labelHeightPx;

            if (!isFinalGeneration) {
                const previewPanel = targetCanvas.parentElement;
                if (previewPanel && previewPanel.clientWidth > 0 && previewPanel.clientHeight > 0) {
                    let maxWidth = previewPanel.clientWidth - 40;
                    let maxHeight = previewPanel.clientHeight - 40;
                    const scaleX = maxWidth > 0 ? maxWidth / labelWidthPx : 1;
                    const scaleY = maxHeight > 0 ? maxHeight / labelHeightPx : 1;
                    const previewScale = Math.min(scaleX, scaleY, 1);
                    
                    targetCanvas.style.width = (labelWidthPx * previewScale) + "px";
                    targetCanvas.style.height = (labelHeightPx * previewScale) + "px";
                    console.log(`Escala de previsualización: ${previewScale.toFixed(2)}, Tamaño display: ${targetCanvas.style.width} x ${targetCanvas.style.height}`);
                } else {
                    console.warn("Panel de previsualización no encontrado o sin dimensiones para calcular escala.");
                    targetCanvas.style.width = (labelWidthPx * 0.5) + "px";
                    targetCanvas.style.height = (labelHeightPx * 0.5) + "px";
                }
            } else {
                targetCanvas.style.width = "";
                targetCanvas.style.height = "";
            }

            targetCtx.clearRect(0, 0, labelWidthPx, labelHeightPx);
            targetCtx.fillStyle = "white";
            targetCtx.fillRect(0, 0, labelWidthPx, labelHeightPx);
            console.log("Canvas limpiado y fondo blanco dibujado.");

            const getScaledFontSize = (baseFontSize) => Math.max(5, baseFontSize * (labelWidthPx / 1000));

            for (const key in config.elements) {
                const elConfig = config.elements[key];
                console.log(`Procesando elemento: ${key}`, JSON.stringify(elConfig));

                if (elConfig.visible === false) {
                    console.log(`  Elemento ${key} es invisible, saltando.`);
                    continue;
                }

                let elX = (elConfig.xPercent || 0) * labelWidthPx;
                let elY = (elConfig.yPercent || 0) * labelHeightPx;

                if (elConfig.type === 'text') {
                    let textToDraw = "";
                    let currentFontConfig = {};

                    if (key === 'matriculaLabel' || key === 'cantidadLabel' || key === 'fechaLabel' || key === 'materialLabel') {
                        textToDraw = elConfig.text;
                        currentFontConfig = config.labelText;
                    } else if (key === 'matriculaQRValue') {
                        textToDraw = labelData.matricula;
                        currentFontConfig = config.codeContentText;
                    } else if (key === 'materialValueText') {
                        textToDraw = labelData.material;
                        currentFontConfig = config.codeContentText;
                    } else if (key === 'cantidadValue') {
                        textToDraw = labelData.cantidad;
                        currentFontConfig = config.dynamicText;
                    } else if (key === 'fechaValue') {
                        textToDraw = labelData.fecha;
                        currentFontConfig = config.dynamicText;
                    }

                    if (textToDraw && currentFontConfig && typeof currentFontConfig.baseFontSize === 'number') {
                        const fontSize = getScaledFontSize(currentFontConfig.baseFontSize);
                        const fontStyle = `${currentFontConfig.fontWeight || "normal"} ${fontSize.toFixed(0)}px ${config.fontFamily || 'Arial'}`;
                        targetCtx.font = fontStyle;
                        targetCtx.fillStyle = currentFontConfig.color || "#000000";
                        targetCtx.textAlign = elConfig.textAlign || 'left';
                        targetCtx.textBaseline = elConfig.textBaseline || 'top'; // Consistente con 'top'
                        console.log(`  Dibujando TEXTO '${textToDraw}' en (${elX.toFixed(0)}, ${elY.toFixed(0)}) con fuente: ${fontStyle}`);
                        targetCtx.fillText(textToDraw, elX, elY);
                    } else {
                        console.log(`  TEXTO para ${key} está vacío o currentFontConfig/baseFontSize falta/inválido. textToDraw: '${textToDraw}', currentFontConfig:`, currentFontConfig ? JSON.stringify(currentFontConfig) : 'undefined');
                    }

                } else if (elConfig.type === 'qr') {
                    let qrSize = (elConfig.sizePercentHeight || 0.5) * labelHeightPx;
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
                    }

                    if (qrData) {
                        console.log(`  Dibujando QR para '${qrData}' en (${drawXqr.toFixed(0)}, ${drawYqr.toFixed(0)}) tamaño: ${qrSize.toFixed(0)}`);
                        const qrContainer = document.createElement('div');
                        try {
                            if (typeof QRCode === 'undefined') { // Usar window.QRCode si se carga globalmente y no es un módulo
                                console.error("QRCode (o window.QRCode) no está definido.");
                                throw new Error("Librería QRCode no cargada.");
                            }
                            new QRCode(qrContainer, { // Asume que QRCode está en el ámbito global
                                text: qrData,
                                width: Math.round(qrSize),
                                height: Math.round(qrSize),
                                colorDark: elConfig.color || "#000000",
                                colorLight: "#FFFFFF",
                                correctLevel: QRCode.CorrectLevel.M
                            });

                            const qrCanvasEl = qrContainer.querySelector('canvas');
                            if (qrCanvasEl) {
                                if (isFinalGeneration) await new Promise(r => setTimeout(r, 50));
                                targetCtx.drawImage(qrCanvasEl, drawXqr, drawYqr, qrSize, qrSize);
                            } else {
                                console.warn(`  QR canvas no encontrado para ${key} (puede ser un problema de timing o error en QRCode).`);
                                targetCtx.strokeRect(drawXqr, drawYqr, qrSize, qrSize);
                            }
                        } catch (e) {
                            console.error(`  Error generando QR para ${key}:`, e);
                            targetCtx.strokeRect(drawXqr, drawYqr, qrSize, qrSize);
                        }
                    } else {
                        console.log(`  Datos para QR (${key}) están vacíos, no se dibuja.`);
                    }
                }
            }
            console.log("--- Fin de drawOrGenerateLabel (éxito aparente) ---");
            if (isFinalGeneration) resolve(targetCanvas.toDataURL('image/png')); else resolve();
        } catch (error) {
            console.error("!!! Error MAYOR en drawOrGenerateLabel:", error);
            reject(error);
        }
    });
}

async function handlePreviewLabel() {
    console.log("handlePreviewLabel disparado");
    const previewBtn = document.getElementById('preview-label-btn');
    if (previewBtn) previewBtn.disabled = true;

    const statusDiv = document.getElementById('label-generation-status');
    if (!statusDiv) {
        console.error("Elemento 'label-generation-status' no encontrado.");
        if (previewBtn) previewBtn.disabled = false;
        return;
    }
    statusDiv.textContent = "Actualizando previsualización...";
    statusDiv.className = 'mb-3 text-center text-muted';

    const matricula = document.getElementById('input-matricula').value || "MATRICULA_PH";
    const cantidad = document.getElementById('input-cantidad').value || "CANT_PH";
    const material = document.getElementById('input-material').value || "MATERIAL_PH";
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const labelData = { matricula, cantidad, material, fecha };
    const configToDraw = deepClone(DEFAULT_CONFIG);

    try {
        if (!previewCanvas || !previewCtx) {
            console.error("previewCanvas o previewCtx no están listos en handlePreviewLabel.");
            throw new Error("Canvas no listo para dibujar.");
        }
        await drawOrGenerateLabel(labelData, configToDraw, previewCanvas, previewCtx, false);
        statusDiv.textContent = "Previsualización actualizada.";
        statusDiv.className = 'mb-3 text-center text-success';
    } catch (error) {
        console.error("Error en handlePreviewLabel durante el dibujado:", error);
        statusDiv.textContent = "Error previsualización: " + (error.message || "Error desconocido");
        statusDiv.className = 'mb-3 text-center text-danger';
    } finally {
        if (previewBtn) previewBtn.disabled = false;
        setTimeout(() => {
            if(statusDiv && statusDiv.classList.contains('text-success')) {
                statusDiv.textContent = '';
                statusDiv.className = 'mb-3 text-center';
            }
        }, 3000);
    }
}

async function createLabelCanvas(labelData, config) {
    console.log("createLabelCanvas disparado con data:", labelData);
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    try {
        const imageDataUrl = await drawOrGenerateLabel(labelData, config, tempCanvas, tempCtx, true);
        return imageDataUrl;
    } catch (error) {
        console.error("Error en createLabelCanvas:", error);
        throw error;
    }
}

async function handleGenerateAndDownload() {
    console.log("handleGenerateAndDownload disparado");
    const generateBtn = document.getElementById('generate-labels-btn');
    if(generateBtn) generateBtn.disabled = true;

    const statusDiv = document.getElementById('label-generation-status');
     if (!statusDiv) {
        console.error("Elemento 'label-generation-status' no encontrado en handleGenerateAndDownload.");
        if (generateBtn) generateBtn.disabled = false;
        return;
    }
    statusDiv.className = 'mb-3 text-center text-muted';

    const matricula = document.getElementById('input-matricula').value;
    const cantidad = document.getElementById('input-cantidad').value; // Se recoge aunque no se use visualmente ahora
    const material = document.getElementById('input-material').value;

    if (!matricula || !material) { // Cantidad podría ser opcional para la validación aquí
        statusDiv.textContent = 'Matrícula y Material son campos requeridos.';
        statusDiv.className = 'mb-3 text-center text-danger';
        if(generateBtn) generateBtn.disabled = false;
        return;
    }
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const labelData = { matricula, cantidad, material, fecha };

    statusDiv.textContent = 'Generando etiqueta...';
    const finalConfig = deepClone(DEFAULT_CONFIG);
    let generatedImagesData = [];

    try {
        const imageDataUrl = await createLabelCanvas(labelData, finalConfig);
        if (imageDataUrl) {
            generatedImagesData.push({ name: `matricula_${labelData.matricula.replace(/[^a-zA-Z0-9.-]/g, '_')}.png`, dataUrl: imageDataUrl });
        } else { throw new Error("imageDataUrl nulo después de createLabelCanvas."); }
    }
    catch (error) {
        console.error("Error en handleGenerateAndDownload durante createLabelCanvas:", error);
        statusDiv.textContent = `Error generando: ${error.message || "Error desconocido"}`;
        statusDiv.className = 'mb-3 text-center text-danger';
        if(generateBtn) generateBtn.disabled = false;
        return;
    }

    if (generatedImagesData.length > 0) {
        statusDiv.textContent = "Creando PDF...";
        await downloadAllLabelsAsPdf(generatedImagesData, statusDiv, "Matricula", finalConfig);
    } else {
        statusDiv.textContent = 'No se generaron imágenes para PDF.';
        statusDiv.className = 'mb-3 text-center text-warning';
    }
    if(generateBtn) generateBtn.disabled = false;
     setTimeout(() => {
        if(statusDiv && !statusDiv.classList.contains('text-danger') && !statusDiv.classList.contains('text-warning')){
            statusDiv.textContent = '';
            statusDiv.className = 'mb-3 text-center';
        }
    }, 3000);
}

async function downloadAllLabelsAsPdf(imagesData, statusDiv, pdfNamePrefix = "Etiquetas", labelConfig) {
    console.log("downloadAllLabelsAsPdf disparado");
    if (!imagesData || imagesData.length === 0) {
        statusDiv.textContent = "No hay imágenes para PDF.";
        statusDiv.className = 'mb-3 text-center text-warning';
        return;
    }

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        console.error("window.jspdf o window.jspdf.jsPDF no está definido.");
        if (statusDiv) {
            statusDiv.textContent = "Error: Librería PDF no cargada.";
            statusDiv.className = 'mb-3 text-center text-danger';
        }
        return;
    }
    const { jsPDF: JSPDF_LOCAL } = window.jspdf;

    const cmToPt = (cm) => cm * CM_TO_INCH * 72;
    const pdfLabelWidthPt = cmToPt(labelConfig.labelWidthCm);
    const pdfLabelHeightPt = cmToPt(labelConfig.labelHeightCm);

    if (isNaN(pdfLabelWidthPt) || pdfLabelWidthPt <=0 || isNaN(pdfLabelHeightPt) || pdfLabelHeightPt <=0) {
        if (statusDiv) {
            statusDiv.textContent = "Dimensiones PDF inválidas.";
            statusDiv.className = 'mb-3 text-center text-danger';
        }
        return;
    }

    const orientation = pdfLabelWidthPt > pdfLabelHeightPt ? 'l' : 'p';
    let pdf;
    try {
        pdf = new JSPDF_LOCAL({ orientation: orientation, unit: 'pt', format: [pdfLabelWidthPt, pdfLabelHeightPt] });
    } catch(e) {
        console.error("Error creando instancia de jsPDF:", e);
        if (statusDiv) {
            statusDiv.textContent = "Error inicializando PDF.";
            statusDiv.className = 'mb-3 text-center text-danger';
        }
        return;
    }

    if (statusDiv) statusDiv.textContent = "Añadiendo a PDF...";
    for (let i = 0; i < imagesData.length; i++) {
        const imgEntry = imagesData[i];
        if (i > 0) pdf.addPage([pdfLabelWidthPt, pdfLabelHeightPt], orientation);
        try {
            pdf.addImage(imgEntry.dataUrl, 'PNG', 0, 0, pdfLabelWidthPt, pdfLabelHeightPt, undefined, 'FAST');
        } catch (e) {
            console.error(`Error añadiendo imagen ${imgEntry.name} al PDF:`, e);
            if (statusDiv) {
                statusDiv.textContent = `Error añadiendo ${imgEntry.name} al PDF.`;
                statusDiv.className = 'mb-3 text-center text-danger';
            }
        }
        if (statusDiv) statusDiv.textContent = `Añadida ${i + 1}/${imagesData.length}`;
        await new Promise(r => setTimeout(r, 1));
    }

    if (statusDiv) statusDiv.textContent = "Guardando PDF...";
    try {
        pdf.save(`${pdfNamePrefix}_${imagesData[0].name.split('.')[0].replace('matricula_', '')}.pdf`);
        if (statusDiv) {
            statusDiv.textContent = "PDF descargado.";
            statusDiv.className = 'mb-3 text-center text-success';
        }
    } catch (e) {
        console.error("Error guardando PDF:", e);
        if (statusDiv) {
            statusDiv.textContent = "Error guardando PDF.";
            statusDiv.className = 'mb-3 text-center text-danger';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM completamente cargado y parseado.");

    previewCanvas = document.getElementById('label-preview-canvas');
    if (!previewCanvas) {
        console.error("CRÍTICO: Elemento canvas 'label-preview-canvas' no encontrado!");
        alert("Error crítico: Canvas no encontrado. La aplicación no funcionará.");
        return; // Detener si el canvas no existe
    }
    previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) {
        console.error("CRÍTICO: No se pudo obtener el contexto 2D del canvas!");
        alert("Error crítico: Contexto del canvas no obtenido. La aplicación no funcionará.");
        return; // Detener si el contexto no se puede obtener
    }
    console.log("Canvas y contexto inicializados correctamente. previewCanvas:", previewCanvas, "previewCtx:", previewCtx);

    setTextContent('#label-generator-screen-title', "Impresión de Matrículas");

    const urlMatricula = getUrlParameter('matricula');
    const urlCantidad = getUrlParameter('cantidad');
    const urlMaterial = getUrlParameter('material');

    const inputMatricula = document.getElementById('input-matricula');
    const inputCantidad = document.getElementById('input-cantidad');
    const inputMaterial = document.getElementById('input-material');

    if (urlMatricula && inputMatricula) inputMatricula.value = urlMatricula;
    if (urlCantidad && inputCantidad) inputCantidad.value = urlCantidad;
    if (urlMaterial && inputMaterial) inputMaterial.value = urlMaterial;
    
    console.log("Datos de URL aplicados (si existen). Intentando previsualización inicial...");
    
    // Asegurarse de que el canvas y el contexto estén listos antes de llamar
    if (previewCanvas && previewCtx) {
        handlePreviewLabel(); // Previsualización inicial
    } else {
        console.error("No se llamó a handlePreviewLabel inicialmente porque canvas o ctx no estaban listos (esto no debería pasar si las comprobaciones anteriores funcionaron).");
    }

    // ... (resto del código para mostrar la pantalla inicial)
    const initialScreen = document.getElementById(currentScreenId);
    if (initialScreen) {
         document.querySelectorAll('.screen-view').forEach(sv => { sv.classList.add('d-none'); sv.classList.remove('active', 'd-flex'); });
        initialScreen.classList.remove('d-none');
        initialScreen.classList.add('active', 'd-flex');
    } else {
        console.error(`Pantalla inicial con id '${currentScreenId}' no encontrada.`);
    }
});

console.log("Script.js cargado completamente (fuera de DOMContentLoaded).");


