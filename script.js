    let currentScreenId = 'screen-label-generator';
    const CM_TO_INCH = 1 / 2.54;
    // CONFIG_STORAGE_KEY ya no es necesario
// ... (inicio de script.js) ...

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

// ... (resto de tu script.js) ...
    function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

   const DEFAULT_CONFIG = {
    labelWidthCm: 10,
    labelHeightCm: 3.5,
    dpi: 600,
    fontFamily: 'Arial, sans-serif',
    dynamicText: {
        baseFontSize: 35,
        fontWeight: "normal",
        color: "#000000"
    },
    labelText: {
        baseFontSize: 30,
        fontWeight: "normal",
        color: "#000000"
    },
    codeContentText: {
        baseFontSize: 35, // Letra para el contenido debajo de QR y Cód. Barras
        fontWeight: "normal",
        color: "#000000"
    },
    elements: {
        // --- Sección Matrícula y QR (sin cambios respecto a tu último DEFAULT_CONFIG) ---
        matriculaLabel: { type: 'text', text: "MATRICULA",
            xPercent: 0.17, yPercent: 0.15,
            textAlign: 'center', textBaseline: 'top' },
        qrCode:         { type: 'qr',
            sizePercentHeight: 0.45,
            xPercent: 0.17, yPercent: 0.35, // Posición Y del QR
            anchor: 'center-top',
            color: "#000000" },
        matriculaQRValue: { type: 'text', // Texto debajo del QR
            xPercent: 0.17, yPercent: 0.82, // Posición Y del texto debajo del QR (0.35 + 0.45 + un poco de espacio)
            textAlign: 'center', textBaseline: 'top' },

        // --- Sección Cantidad y Fecha (sin cambios) ---
        cantidadLabel:  { type: 'text', text: "CANTIDAD",
            xPercent: 0.50, yPercent: 0.15,
            textAlign: 'center', textBaseline: 'top' },
        cantidadValue:  { type: 'text',
            xPercent: 0.50, yPercent: 0.40,
            textAlign: 'center', textBaseline: 'top' },
        fechaLabel:     { type: 'text', text: "FECHA",
            xPercent: 0.50, yPercent: 0.60,
            textAlign: 'center', textBaseline: 'top' },
        fechaValue:     { type: 'text',
            xPercent: 0.50, yPercent: 0.85,
            textAlign: 'center', textBaseline: 'top' },

        // --- Sección Material y Código de Barras (CON CAMBIOS) ---
        materialLabel:  { type: 'text', text: "MATERIAL",
            xPercent: 0.83, yPercent: 0.15, // Mantener o ajustar Y si el barcode es mucho más alto
            textAlign: 'center', textBaseline: 'top' },
        barcode:        { type: 'barcode',
            // --- AJUSTES PARA HACERLO MÁS GRANDE ---
            heightPercentHeight: 0.80,  // Ejemplo: Aumentado de 0.40 a 0.60 (60% de la altura de la etiqueta)
            widthPercentWidth: 0.45,   // Ejemplo: Aumentado de 0.30 a 0.45 (permite más espacio horizontal)
            // --- FIN AJUSTES ---
            xPercent: 0.7, yPercent: 0.30,  // Posición Y del código de barras.
                                             // Si heightPercentHeight es 0.60, y quieres que empiece un poco debajo de materialLabel (0.15)
                                             // y que quede espacio para el texto debajo, 0.30 podría ser un buen punto de partida para yPercent.
                                             // (0.15 (label) + un pequeño espacio + 0.30 (inicio barcode))
                                             // El anclaje es 'center-top', así que yPercent es el borde superior.
            anchor: 'center-top',
            color: "#000000",
            displayValue: false
        },
        materialBarcodeValue:  { type: 'text', // Texto debajo del Código de Barras
            xPercent: 0.83, yPercent: 0.93,  // Posición Y del texto debajo del código de barras.
                                             // Si el barcode empieza en y=0.30 y tiene alto de 0.60, termina en y=0.90.
                                             // Así que 0.92 le da un pequeño espacio.
            textAlign: 'center', textBaseline: 'top' }
    }
};
    let previewCanvas, previewCtx;
    // currentWorkingConfig ya no es necesario si todo es fijo y se toma de DEFAULT_CONFIG
    // let currentWorkingConfig = {}; // Puedes eliminar esta línea

    function setTextContent(selector, text) {
        const element = document.querySelector(selector);
        if (element) element.textContent = text;
    }

    // Funciones populateFormFromConfig, initializeFormAndPreview, saveConfiguration, loadConfiguration eliminadas
    // Función handleSettingChange eliminada (reemplazada por llamada directa a handlePreviewLabel en oninput)

    async function handlePreviewLabel() {
        // console.log("Botón 'Actualizar Previsualización' PRESIONADO o input cambiado. Iniciando handlePreviewLabel...");
        const previewBtn = document.getElementById('preview-label-btn');
        if (previewBtn) previewBtn.disabled = true; // El botón puede no existir si solo se usa oninput

        const statusDiv = document.getElementById('label-generation-status');
        statusDiv.textContent = "Actualizando previsualización...";
        statusDiv.className = 'mb-3 text-center text-muted';

        const matricula = document.getElementById('input-matricula').value || "MATRICULA"; // Placeholder más genérico
        const cantidad = document.getElementById('input-cantidad').value || "CANT";
        const material = document.getElementById('input-material').value || "MATERIAL_COD";
        const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const labelData = { matricula, cantidad, material, fecha };
        // Usar DEFAULT_CONFIG directamente ya que no hay configuraciones que el usuario cambie
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
        // (Esta función permanece igual que en la respuesta anterior, ya que toma 'config' como argumento)
        // ... (código de drawOrGenerateLabel sin cambios aquí) ...
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

                        if (key.includes("Label")) {
                            textToDraw = elConfig.text;
                            currentFontConfig = config.labelText;
                        } else if (key === 'matriculaQRValue') {
                            textToDraw = labelData.matricula;
                            currentFontConfig = config.codeContentText;
                        } else if (key === 'materialBarcodeValue') {
                            textToDraw = labelData.material;
                            currentFontConfig = config.codeContentText;
                        } else {
                            currentFontConfig = config.dynamicText;
                            if (key === 'cantidadValue') textToDraw = labelData.cantidad;
                            else if (key === 'fechaValue') textToDraw = labelData.fecha;
                        }

                        targetCtx.font = `${currentFontConfig.fontWeight || "normal"} ${getScaledFontSize(currentFontConfig.baseFontSize)}px ${config.fontFamily}`;
                        targetCtx.fillStyle = currentFontConfig.color || "#000000";
                        targetCtx.textAlign = elConfig.textAlign || 'left';
                        targetCtx.textBaseline = elConfig.textBaseline || 'alphabetic';
                        targetCtx.fillText(textToDraw, elX, elY);

                    } else if (elConfig.type === 'qr' && key === 'qrCode') {
                        let qrSize = elConfig.sizePercentHeight * labelHeightPx;
                        let drawXqr = elX;
                        let drawYqr = elY;
                        
                        if (elConfig.anchor === 'center-top') {
                           drawXqr = elX - qrSize / 2;
                        } else if (elConfig.anchor === 'left-top') {
                           // elX, elY son la esquina superior izquierda
                        } else {
                            drawXqr = elX - qrSize / 2;
                            drawYqr = elY - qrSize / 2;
                        }

                        const qrContainer = document.createElement('div');
                        try {
                            new QRCode(qrContainer, { text: labelData.matricula, width: Math.round(qrSize), height: Math.round(qrSize), colorDark: elConfig.color, colorLight: "#FFFFFF", correctLevel: QRCode.CorrectLevel.M });
                            if (isFinalGeneration && qrContainer.querySelector('canvas')) await new Promise(r => setTimeout(r, 30));
                            const qrCanvasEl = qrContainer.querySelector('canvas');
                            if (qrCanvasEl) targetCtx.drawImage(qrCanvasEl, drawXqr, drawYqr, qrSize, qrSize);
                        } catch (e) { console.warn(`Error QR:`, e); targetCtx.strokeRect(drawXqr, drawYqr, qrSize, qrSize); }

                    } else if (elConfig.type === 'barcode' && key === 'barcode') {
                        let bcHeight = elConfig.heightPercentHeight * labelHeightPx;
                        let drawXbc = elX;
                        let drawYbc = elY;

                        const bcTemp = document.createElement('canvas');
                        try {
                            JsBarcode(bcTemp, labelData.material, {
                                format: "CODE128", lineColor: elConfig.color, background: "#FFFFFF",
                                width: Math.max(1, 1.8 * (labelWidthPx/1000)),
                                height: bcHeight,
                                displayValue: false,
                                margin: 0
                            });
                            let barcodeActualWidth = bcTemp.width;
                            
                            if (elConfig.anchor === 'center-top') {
                                drawXbc = elX - (barcodeActualWidth / 2);
                            } else if (elConfig.anchor === 'left-top') {
                                // elX es el inicio
                            }
                            targetCtx.drawImage(bcTemp, drawXbc, drawYbc, barcodeActualWidth, bcHeight);
                        } catch (e) { console.warn(`Error Barcode:`, e); }
                    }
                }
                if (isFinalGeneration) resolve(targetCanvas.toDataURL('image/png')); else resolve();
            } catch (error) {
                console.error("Error en drawOrGenerateLabel:", error);
                reject(error);
            }
        });
    }


    async function createLabelCanvas(labelData, config) {
        // (Esta función permanece igual)
        // ...
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        try {
            const imageDataUrl = await drawOrGenerateLabel(labelData, config, tempCanvas, tempCtx, true);
            return imageDataUrl;
        } catch (error) {
            console.error("Error creando imagen para:", labelData, error);
            throw error;
        }
    }

    async function handleGenerateAndDownload() {
        // (Esta función permanece casi igual, solo usa DEFAULT_CONFIG)
        const generateBtn = document.getElementById('generate-labels-btn');
        generateBtn.disabled = true;
        const statusDiv = document.getElementById('label-generation-status');
        statusDiv.className = 'mb-3 text-center text-muted';

        const matricula = document.getElementById('input-matricula').value;
        const cantidad = document.getElementById('input-cantidad').value;
        const material = document.getElementById('input-material').value;

        if (!matricula || !cantidad || !material) {
            statusDiv.textContent = 'Por favor, complete todos los campos.';
            statusDiv.className = 'mb-3 text-center text-danger';
            generateBtn.disabled = false; return;
        }
        const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const labelData = { matricula, cantidad, material, fecha };

        statusDiv.textContent = 'Generando etiqueta...';
        const finalConfig = deepClone(DEFAULT_CONFIG); // Usar DEFAULT_CONFIG directamente
        let generatedImagesData = [];

        try {
            const imageDataUrl = await createLabelCanvas(labelData, finalConfig);
            if (imageDataUrl) {
                generatedImagesData.push({ name: `matricula_${labelData.matricula.replace(/[^a-zA-Z0-9.-]/g, '_')}.png`, dataUrl: imageDataUrl });
            } else { throw new Error("imageDataUrl nulo."); }
        }
        catch (error) {
            statusDiv.textContent = `Error generando: ${error.message}`;
            statusDiv.className = 'mb-3 text-center text-danger';
            generateBtn.disabled = false; return;
        }

        if (generatedImagesData.length > 0) {
            statusDiv.textContent = "Creando PDF...";
            await downloadAllLabelsAsPdf(generatedImagesData, statusDiv, "Matricula", finalConfig);
        } else {
            statusDiv.textContent = 'No se generaron etiquetas para PDF.';
            statusDiv.className = 'mb-3 text-center text-warning';
        }
        generateBtn.disabled = false;
         setTimeout(() => {
            if(!statusDiv.classList.contains('text-danger') && !statusDiv.classList.contains('text-warning')){
                statusDiv.textContent = '';
                statusDiv.className = 'mb-3 text-center';
            }
        }, 3000);
    }

    async function downloadAllLabelsAsPdf(imagesData, statusDiv, pdfNamePrefix = "Etiquetas", labelConfig) {
        // (Esta función permanece igual)
        // ...
        if (!imagesData || imagesData.length === 0) { return; }
        if (!window.jspdf || !window.jspdf.jsPDF) { return; }
        const { jsPDF } = window.jspdf;

        const cmToPt = (cm) => cm * CM_TO_INCH * 72;
        const pdfLabelWidthPt = cmToPt(labelConfig.labelWidthCm);
        const pdfLabelHeightPt = cmToPt(labelConfig.labelHeightCm);

        const orientation = pdfLabelWidthPt > pdfLabelHeightPt ? 'l' : 'p';
        let pdf = new jsPDF({ orientation: orientation, unit: 'pt', format: [pdfLabelWidthPt, pdfLabelHeightPt] });

        statusDiv.textContent = "Añadiendo a PDF...";
        for (let i = 0; i < imagesData.length; i++) {
            const imgEntry = imagesData[i];
            if (i > 0) pdf.addPage([pdfLabelWidthPt, pdfLabelHeightPt], orientation);
            pdf.addImage(imgEntry.dataUrl, 'PNG', 0, 0, pdfLabelWidthPt, pdfLabelHeightPt, undefined, 'FAST');
            statusDiv.textContent = `Añadida ${i + 1}/${imagesData.length}`;
            await new Promise(r => setTimeout(r, 1));
        }

        statusDiv.textContent = "Guardando PDF...";
        try {
            pdf.save(`${pdfNamePrefix}_${imagesData[0].name.split('.')[0]}.pdf`);
            statusDiv.textContent = "PDF descargado.";
            statusDiv.className = 'mb-3 text-center text-success';
        } catch (e) {
            statusDiv.textContent = "Error guardando PDF.";
            statusDiv.className = 'mb-3 text-center text-danger';
        }
    }


  document.addEventListener('DOMContentLoaded', function() {
    previewCanvas = document.getElementById('label-preview-canvas');
    if (previewCanvas) previewCtx = previewCanvas.getContext('2d');
    else { console.error("Preview canvas not found!"); alert("Error: Canvas no encontrado."); return; }

    setTextContent('#label-generator-screen-title', "Impresión de Matrículas");

    // --- NUEVO: LEER PARÁMETROS DE LA URL ---
    const urlMatricula = getUrlParameter('matricula');
    const urlCantidad = getUrlParameter('cantidad');
    const urlMaterial = getUrlParameter('material');

    const inputMatricula = document.getElementById('input-matricula');
    const inputCantidad = document.getElementById('input-cantidad');
    const inputMaterial = document.getElementById('input-material');

    if (urlMatricula && inputMatricula) {
        inputMatricula.value = urlMatricula;
    }
    if (urlCantidad && inputCantidad) {
        inputCantidad.value = urlCantidad;
    }
    if (urlMaterial && inputMaterial) {
        inputMaterial.value = urlMaterial;
    }
    });
