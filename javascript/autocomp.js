
// TODO REFACTORER pour que ce soit plus propre et maintenable
// TODO gérer la vérification AUTOCOMP en global, quelque soit la frappe clavier (plutôt que dans les cas spécifiquement isolés)
// TODO quand on écrit un mot qui correspond exactement à une annotation -> annotation est effectuée automatiquement (proposition de la version non annotée du mot en plus)
// TODO quand on focus() / déplace le curseur / revient en arrière -> mettre à jour suggestion (actuellement suggestion uniquement mise à jour sur frappe.

// FAIT:
// gérer la suppression de texte (del ou suppr) et le déplacement des commentaires
// gérer la suppression de texte sélectionné (del, suppr ou frappe clavier) // TODO vérifier que ça marche avec tous les caractères... par exemple, enter?
// proposer une suggestion par rapport au mot en cours de frappe
// détecter le mot en cours de frappe
// gérer un système d'annotation dans textarea
// gérer le cas des majuscules/minuscules, mots au pluriel/singulier...
// utiliser "tab" pour compléter avec les annotations disponibles
// FAIT Bogue qui décale annotations dans certains cas -> les flèches de direction ne doivent pas déclencher de modification des annotations.

var Autocompleter = function(html_id,concepts) {
	this.text_input_el = document.getElementById(html_id);
	this.type = this.text_input_el.tagName;
//console.log(this.type);
	this.suggestion = document.createElement("ul");
	this.suggestion.setAttribute("class","Autocompleter");
//	$(this.suggestion).data("autocompleter",this);
	$(this.text_input_el).after(this.suggestion);
	this.text_input_el.addEventListener('keydown',this.parse_key_press.bind(this));
	$(this.suggestion).on('click',this.click.bind(this));
	this.annotations = [];
	if(this.type === "TEXTAREA") {
		$("#"+html_id).highlightTextarea({
			annotations: this.annotations,
			resizable: true,
			debug: false
		});
	}
	this.word_sep = [" ",",",".","'","(",")","!",":",";","?","\n","-","\t","/","\\"];
	this.concepts = concepts || [];
	this.start_with = '';
	this.values = [];
	this.current_selection = undefined; // suggestion en cours de sélection (qui est autocomplétée si tab ou clic souris)
	this.current_pos = undefined;
};

Autocompleter.prototype = {
	update_highlight: function() {
		$(this.text_input_el).highlightTextarea('setAnnotations',this.annotations);
	},
	set_concepts: function(concepts) {
		this.concepts = concepts;
	},
	init: function(start_str) {
		this.filter_annotations();
		str = start_str || '';
		this.current_selection = undefined;
		this.current_pos = undefined;
		this.values = this.concepts;
		return this.narrow_input(str);
	},
	narrow_input: function(str) {
		this.start_with = str.toLowerCase(); // toLocalLowerCase(); // ?
		var added_values = [];
		var new_values = this.values.filter(function(concept) {
			return (concept.text.indexOf(this.start_with) == 0) || (concept.plural.indexOf(this.start_with) == 0);
		},this);
		this.values = new_values.concat(added_values);
		this.display();
		return (this.values.length > 0); // return true if some suggestions
	},
	display: function() {
//console.log("display - begin - "+(this.current_selection?this.current_selection.text:"undefined"));
		$(this.suggestion).empty();
		if(this.start_with == "") { return false; }
		var selection_not_found = true;
		var pos_count = 0;
		this.values.forEach(function(concept,key) {
			var selected = '';
			if(concept === this.current_selection) {
				selected = ' selected';
				selection_not_found = false;
				this.current_position = key;
			}
			if(concept.class !== undefined) {
				$("<li class=\""+concept.class+" "+concept.label+selected+"\"><strong>"+concept.text+"</strong> ("+concept.class+")</li>").data("pos",pos_count).appendTo(this.suggestion);
			} else {
				$("<li class\""+selected+"\">"+concept.text+"</li>").data("pos",pos_count).appendTo(this.suggestion);
			}
			pos_count++;
		},this);
		if(this.current_pos === undefined || selection_not_found) {
//console.log("nothing selected -> default behaviour");
			this.current_pos = undefined;
			this.current_selection = undefined;
			this.move_selection(1);
//console.log(this.current_
		}
//console.log("display - end - "+(this.current_selection?this.current_selection.text:"undefined"));
	},

	parse_input: function(str) {
		if(this.start_with !== "" && str.indexOf(this.start_with) == 0) {
			if(str !== this.start_with) {
				return this.narrow_input(str);
			}
		} else {
			return this.init(str);
		}	
	},

	up: function(e) {
		return this.move_selection(-1);
	},
	down: function(e) {
		return this.move_selection(1);
	},
/*
	esc: function(e) {
	},
*/
	move_selection: function(offset) {
		if(this.values == '') { return true; }
		var new_pos = 0;
		if(this.current_pos !== undefined) {
			new_pos = this.current_pos+offset;
			$("li",this.suggestion).removeClass("selected");
		}
		if(new_pos < 0) {
			this.current_pos = undefined;
		} else {
			if(new_pos > this.values.length-1) { new_pos = this.values.length-1; }
			$("li",this.suggestion)[new_pos].className += " selected";
			this.current_pos = new_pos;
		}
		this.update_selection_from_pos();
//console.log("position "+this.current_pos);
		return false;
	},
	update_selection_from_pos: function() {
		if(this.current_pos === undefined) {
			this.current_selection = undefined;
		} else {
			this.current_selection = this.values[this.current_pos];
		}
	},

	autocomp: function() {
//console.log(this.current_selection);
		if(this.current_selection === undefined) { return false; }
	//	var sugg = $("#suggestions > li")[this.current_selection].innerHTML;
		$(this.text_input_el).trigger("Autocompleter:autocomplete",this.current_selection);
		return this.current_selection;
	},

	/* UI interaction - On key press */
	click: function(e) {
		var data = $(e.target).closest('li').data('pos');
//		console.log(data);
		if(data !== null) {
			this.move_selection(data - this.current_pos);
			var concept = this.autocomp();
			if(concept !== false) {
				if(this.type === "TEXTAREA") { // TEXTAREA field
					var a = this.annotations.find(function(a) {
						return a.class == "autocomplete";
					});
//		console.log(a);
					if(a !== undefined) {
						// replace annotation by the selected concept
						var text = $(this.text_input_el).val();
//						console.log(text);

						// update the text field
						text = text.substr(0,a.begin) + concept.text + text.substr(a.begin+a.length);
						$(this.text_input_el).val(text);
						// add the annotation
						this.filter_annotations();
						this.annotations_update(a.begin,concept.tex-a.length);
						this.annotations.push({
							text: concept.text,
							begin:a.begin,
							length:concept.text.length,
							class:concept.class,
							label:concept.label
						});
						this.init();
						this.update_highlight();
					} 
				} else { // INPUT field
					$(this.text_input_el).val(concept.text);
					this.init();
				}
			}			
		}
/*
					char = "";
					var new_word = previous_word+concept.text.substr(previous_word.length);
console.log(new_word);
					annot = { 
						text: new_word,
						begin: pos_bw,
						length: new_word.length,
						label: concept.label,
						class: concept.class
					};

					inserted_text = concept.text.substr(previous_word.length);
					inserted_offset = annot.length-previous_word.length;

		this.
*/
	},
	parse_key_press: function(e) {
		if(this.type === "TEXTAREA") {
			this.parse_key_press_textarea(e);
		} else {
			this.parse_key_press_input(e);
		}
	},
	parse_key_press_textarea: function(e) {
		var selection_len = e.target.selectionEnd - e.target.selectionStart;
		var pos_offset = 0;
		var annot;
		var inserted_offset = 0;
		var return_value = true;
		var inserted_text = "";
		var char = "";
		var test_eq = true;
		var modifier_key = false;


		var dom_el = e.target;
		var text = dom_el.value;
		var pos = dom_el.selectionStart;
		var text_bs = text.substr(0,dom_el.selectionStart);
		var text_as = text.substr(dom_el.selectionEnd);
		var pos_bw = this.pos_of_word_start(text_bs);
		var previous_word = text_bs.substr(pos_bw);

		switch (e.keyCode) {   
		    case 16: //shift    
		    case 17: //ctrl    
		    case 18: //alt  
		    case 20: //caps lock
		    case 27: //esc     
		    case 37: //left arrow  
		    case 39: //right arrow   
		    case 33: //page up    
		    case 34: //page down    
		    case 36: //home    
		    case 35: //end 
				modifier_key = true;
		        break;
		    case 38: //up arrow   
				modifier_key = true;
				return_value = this.up();
				break; 
		    case 40: //down arrow     
				modifier_key = true;
				return_value = this.down(); 
				break;                 
		    case 13: //enter
				char = "\n";
				// code bellow will be executed as well
		    case 9: //tab    
				var concept = this.autocomp();
				if(concept !== false) {
//		console.log(concept);
						
					char = "";
					var new_word = previous_word+concept.text.substr(previous_word.length);
//console.log(new_word);
					annot = { 
						text: new_word,
						begin: pos_bw,
						length: new_word.length,
						label: concept.label,
						class: concept.class
					};

					inserted_text = concept.text.substr(previous_word.length);
					inserted_offset = annot.length-previous_word.length;

					return_value = false;
				}
				break;
		    case 8: //backspace
				inserted_offset = (selection_len === 0)?-1:0;
				var test_eq = false;
				pos_offset = -1;
				break;
		    case 46: //delete   
				inserted_offset = (selection_len === 0)?-1:0;
				pos_offset = 1;
				break;  
			default:
				if(e.keyCode !== 0) { // only add a char if it is not a key modifier...
					inserted_offset = 1;
					char = String.fromCharCode(e.keyCode);
				}
				break;
		}
/*
console.log(e);
console.log("keyCode: "+e.keyCode+":"+String.fromCharCode(e.keyCode));
console.log("charCode: "+e.charCode+":"+String.fromCharCode(e.charCode));
console.log(char+" isChar?"+e.isChar);
*/
		if(!modifier_key) {
			word = previous_word+inserted_text+char;

			text = text_bs + inserted_text + char + text_as;
			// If autocompletion -> need to change the input field
			if(inserted_text !== "") { dom_el.value = text; }
			// TODO write explanation
			if((inserted_text+char).length > 0 && $.inArray((inserted_text+char)[0],this.word_sep) !== -1) {
		console.log("special char: '"+(inserted_text+char)[0]+"'");
				test_eq = false;
			}
			this.annotations_update(pos+pos_offset,inserted_offset-selection_len,test_eq);
			this.filter_annotations();

			if(annot !== undefined && annot.label !== undefined) {
				var pos_selection = pos_bw+new_word.length;
				dom_el.selectionStart = pos_selection;
				dom_el.selectionEnd = pos_selection;
				this.annotations.push(annot);
				this.init();
			} else if(this.parse_input(word)) {
				this.annotations.push({
								begin:pos_bw,
								length:word.length,
								class:"autocomplete",
								label:""
							});
			}
			this.update_highlight();
		}
		if(return_value === false) {
			e.preventDefault();
		}
		return return_value;
	},

	parse_key_press_input: function(e) {
		var selection_len = e.target.selectionEnd - e.target.selectionStart;
		var pos_offset = 0;
		var return_value = true;
		var inserted_text = "";
		var char = "";


		var dom_el = e.target;
		var text = dom_el.value;
		var text_bs = text.substr(0,dom_el.selectionStart);
		var text_as = text.substr(dom_el.selectionEnd);

		switch (e.keyCode) {   
		    case 38: //up arrow   
				var inserted_offset = 0;
				return_value = this.up();
				break; 
		    case 40: //down arrow     
				var inserted_offset = 0;
				return_value = this.down(); 
				break;                 
		    case 13: //enter
				// code bellow will be executed as well
		    case 9: //tab    
				var concept = this.autocomp();
				if(concept !== false) {
		console.log(concept);
						
					char = "";

					inserted_text = concept.text.substr(text.length);

					return_value = false;
				}
				break;
		    case 8: //backspace
				inserted_offset = (selection_len === 0)?-1:0;
				pos_offset = -1;
				break;
		    case 46: //delete   
				inserted_offset = (selection_len === 0)?-1:0;
				pos_offset = 1;
				break;
			default:
				char = String.fromCharCode(e.charCode);
				break;
		}

//console.log(dom_el.value);
		text = text_bs + inserted_text + char + text_as;
//		word = previous_word+inserted_text+char;

		if(inserted_text !== "") { dom_el.value = text; }
		this.parse_input(text)

		if(return_value === false) {
			e.preventDefault();
		}
		return return_value;
	},
	parse_del_key: function() {
	},

	filter_annotations: function() {
		this.annotations = this.annotations.filter(function(a) {
			return a.class !== "autocomplete";
		});
	},
	/**
	 * Updates the positions of the all the annotations
	 * based on the position where text has been edited
	 * and the length of text edited (can be negative if
	 * text has been deleted.
	 * test_eq shoud be true if adding a character at the
	 * end of the annotation changes it and false otherwise.
	 * test_eq should be false if the added character is 
	 * one of the this.word_sep character and true otherwise.
	 */
	annotations_update: function(pos,len,test_eq) {
		if(len===undefined) { len = 1; }
		var pos_end = (len>0)?pos:pos-len; // Corrects bug when deleting text with annotations
//console.log(len);
		// remove annotation if word is being edited
		if(test_eq) {
			this.annotations = this.annotations.filter(function(a) {
				return !((a.begin < pos_end)&&(a.begin+a.length >= pos));
			})
		} else {
			this.annotations = this.annotations.filter(function(a) {
				return !((a.begin < pos_end)&&(a.begin+a.length > pos));
			})
		}
		// move annotation to the right if after where text is inserted
		this.annotations = this.annotations.map(function(a) {
			if(a.begin >= pos) { a.begin += len; }
			return a;
		})
	},
	pos_of_word_start: function(text) {
		var max = 0;
		var array_pos = this.word_sep.forEach(function(c) {
			var pos = text.lastIndexOf(c) + 1; // si -1, alors, pas trouvé et donc la formule tient.
			if(pos>max) {max = pos;}
		});
		return max;
	},
};

