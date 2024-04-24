$(document).ready(function() {
    var $body = $('body');

    var init = function(){
        attachHandlers();
    };

    var attachHandlers = function(){
        $body.on("click", ".convert-form-to-pdf", function() {
            var $this = $(this);
            var mode = $this.data("pdf-mode");
            mode = mode || 'save';
            if(! ((mode == 'save') || (mode == 'print')) ){
                mode = 'save';
            }

            var appendTimestamp = $this.data("pdf-append-timestamp");
            if(typeof appendTimestamp != 'boolean') {
                if(! ((appendTimestamp == 'true') || (appendTimestamp == 'false')) ){
                    appendTimestamp = true;
                } else {
                    appendTimestamp = appendTimestamp == 'true';
                }
            }

            var $form = $this.closest('form');

            if($form.length) {
                convertFormAsPDF($form, "testDocument", appendTimestamp, (mode=='save'));
            }
        });
    };

    init();

    var convertFormAsPDF = function($form, outputPdfName = 'document', appendTimestampToPDFName = true, saveInsteadOfOpening = true) {
        if(window.jspdf && window.html2canvas && window.DOMPurify) {
            var formElement = $form[0];

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'pt', 'a4');

            let pWidth = pdf.internal.pageSize.width;//595.28 is the width of A4
            let srcWidth = formElement.scrollWidth;

            let margin = 18;//A narrow margin is 1.27cm (size 36)
            let scale = (pWidth - margin * 2) / srcWidth;

            //omits elements with the attribute [data-html2canvas-ignore="true"] or the class "ignore-for-pdf"
            //removes the class "hidden" from elements that ALSO have the CSS class "include-for-pdf"
            //can be styled with CSS rules scoped to the class "jspdf-document"
            pdf.html(formElement, {
                x: margin,
                y: margin,
                autoPaging: 'text',
                pagesplit: true,
                pagebreak: { avoid: 'tr', mode: ['css'], },
                html2canvas: {
                    scale: scale,
                    useCORS: true,
                    allowTaint: true,
                    letterRendering: true,
                    backgroundColor: "#FFFFFF",
                    ignoreElements: function(el) {
                        return el.classList.contains('ignore-for-pdf');
                    },
                    onclone: function(clonedDocument) {
                        clonedDocument.body.classList.add('jspdf-document');
                        //hard-code cloned document with to prevent over-rendering
                        clonedDocument.body.style = document.body.scrollWidth+`px`;

                        const si = clonedDocument.getElementById('site-inspector');
                        if(si) {
                            si.parentElement.removechild(si);
                        }

                        var elementsToShow = clonedDocument.querySelectorAll('.include-for-pdf.hidden');
                        [...elementsToShow].forEach(function(el){ el.classList.remove(hidden); });

                        //swap form inputs/controls for divs to display values nicely
                        var formInputTypesToSwap = ["text","date","datetime-local","email","month","number","tel","time","url","week"];
                        var inputSelectors = formInputTypesToSwap.map(function(type){ return 'input[type="'+type+'"]'; });
                        inputSelectors.push("textarea");
                        inputSelectors.push("select");

                        [...clonedDocument.querySelectorAll(inputSelectors.join(", ") )].forEach(function(inputElement){
                            const newDiv = clonedDocument.createElement("div");
                            newDiv.classList.add("form-control", "form-value-display");

                            if(inputElement.hasAttribute('disabled') || inputElement.classList.contains('disabled')) {
                                newDiv.classList.add('disabled');
                            }

                            newDiv.innerHTML = inputElement.value;

                            inputElement.replaceWith(newDiv);
                        });

                        var basePdfStyles = clonedDocument.createElement("style");
                        basePdfStyles.type = "text/css";

                        basePdfStyles.textContent = `
                            .jspdf-document {
                                animation-name: unset !important;
                                -webkit-animation-duration: 0s !important;
                                animation-duration: 0s !important;
                                -webkit-animation-fill-mode: none !important;
                                animation-fill-mode: none !important;
                                -webkit-transition: none !important;
                                -moz-transition: none !important;
                                -o-transition: none !important;
                                transition: none !important;
                                box-shadow: none;
                                -moz-box-shadow: none;
                                -webkit-box-shadow: none;
                                margin-bottom: 0;
                                background-color: #ffffff;
                            }

                            .jspdf-document .include-for-pdf {
                                display: inline-block;
                            }

                            .jspdf-document input[type="radio"] {
                                display: inline-block;
                                width: auto;
                                vertical-align: bottom;
                            }

                            .jspdf-document input[type="radio"][disabled], .jspdf-document .radio.disabled {
                                background-color: #ccc;
                            }

                            .jspdf-document .heading h2 {
                                padding-bottom: 12px;
                                margin-bottom: 12px;
                            }

                            .jspdf-document .form-value-display {
                                display: inline-block;
                                width: 100%;
                                font-size: 14px;
                                line-height: 1.42857143;
                                border-radius: 4px;
                                -webkit-box-shadow: none;
                                box-shadow: none;
                                -webkit-transition: none;
                                -o-transition: none;
                                -webkit-transition: none;
                                transition: none;
                                background-color: #ffffff;
                                color: #000000;
                                height: fit-content;
                                min-height: 38px;
                                background-image: none;
                                border: 2px solid #000000;
                                font-family: "Times New Roman", serif;
                                padding: 6px 12px 6px 12px;
                                resize: none;
                                word-wrap: break-word;
                                word-break: break-word;
                                overflow: visible;
                                vertical-align: middle;
                                text-align: left;
                            }

                            .jspdf-document .form-value-display.disabled {
                                background-color: #ccc;
                            }

                            .jspdf-document label {
                                margin-bottom: 4px;
                            }
                        `;

                        clonedDocument.body.insertBefore(basePdfStyles, clonedDocument.body.children[0]);
                        clonedDocument.body.scrollTop = 0;

                        const sleep = function(millis) {
                            const currentTime = new Date().getTime();
                            // eslint-disable-next-line no-empty
                            while (currentTime + millis >= new Date().getTime()) {}
                        };

                        sleep(200);//allow the cloned document to finish any calculations/re-rendering

                        return clonedDocument;
                    },

                },

                callback: function(){
                    let finalPdfName = outputPdfName;

                    if(appendTimestampToPDFName) {
                        const current = new Date();
                        const timestamp = [current.getMonth()+1, current.getDate(), current.getFullYear(), current.getHours(), current.getMinutes()];
                        finalPdfName += "-" + timestamp.join("-");
                    }
                    finalPdfName += ".pdf";

                    if(saveInsteadOfOpening) {
                        pdf.save(finalPdfName);
                    } else {
                        window.open(pdf.output('dataurlnewwindow'));
                    }
                },
            });//closing of pdf.html
        } else {
            alert("The generation of a PDF from a form requires \"html2canvas\", \"html2canvas\" and \"DOMPurify\" to be loaded.");
        }
    };
});