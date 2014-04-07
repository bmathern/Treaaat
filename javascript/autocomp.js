
// TODO REFACTORER pour que ce soit plus propre et maintenable
// TODO gérer la vérification AUTOCOMP en global, quelque soit la frappe clavier (plutôt que dans les cas spécifiquement isolés)
// TODO quand on écrit un mot qui correspond exactement à une annotation -> annotation est effectuée automatiquement (proposition de la version non annotée du mot en plus)
// TODO quand on focus() / déplace le curseur / revient en arrière -> mettre à jour suggestion (actuellement suggestion uniquement mise à jour sur frappe.
// TODO BUG with input text field

// FAIT:
// gérer la suppression de texte (del ou suppr) et le déplacement des commentaires
// gérer la suppression de texte sélectionné (del, suppr ou frappe clavier) // TODO vérifier que ça marche avec tous les caractères... par exemple, enter?
// proposer une suggestion par rapport au mot en cours de frappe
// détecter le mot en cours de frappe
// gérer un système d'annotation dans textarea
// gérer le cas des majuscules/minuscules, mots au pluriel/singulier...
// utiliser "tab" pour compléter avec les annotations disponibles
// FAIT Bogue qui décale annotations dans certains cas -> les flèches de direction ne doivent pas déclencher de modification des annotations.

// FAIT BUG accents -> closes autocomplete box
// FAIT BUG autocompleted+"," -> breaks the annotation
// FAIT BUG copier-coller => casse tout! oncopy, oncut et onpaste?
//
// -> lié au fait que le e.keyCode ou e.charCode ne renvoit pas le caractère, mais la touche
// => "7" au lieu de "è", d'où le problème de matching entre les mots.
// IDÉE DE SOLUTIONS:
// Découper le problème en deux :
// + l'appui sur la touche de charactère sert à mettre à jour les annotations
// mais ne propose pas de nouvelle autocomplétions
// => trouver un moyen de lancer un callback après l'événement keyup ?


/**
 * A concept represents TODO 
 * @typedef {Object} Concept
 * @property {Array.<String>} variations Array of spelling variation of the concept TODO text->variations
 * @property {String} label Label attached to the concept
 * @property {String} class Class to which the concept belongs
 * @todo TODO compléter description de ce que c'est.
 * @example
 * lychee_concept = {
 *   variations: ["lychee","lychees","litchi","litchies"],
 *   label: "lychee",
 *   class: "fruit"
 * };
 */

/**
 * @summary
 * Autocompleter offers an autocomplete feature in <code>TEXTAREA</code> elements
 * and allow to annotate the text based on the selected autocompletion.
 * @description
 * Autocompleter is a Javascript Object that adds autocompleting functionnality
 * to a <code>TEXTAREA</code> HTML element. In addition to the autocompletion,
 * the autocompleted text will be annotated, meaning that the actual text
 * written will be tagged with two labels: one corresponding to the text's concept,
 * and one corresponding to the concept's class.
 * For instance, when writting the text "lychee", if the concept of "lychee" is
 * defined as a fruit, the annotation will add the HTML class "lychee" and "fruit"
 * to the <code>SPAN</code> element containing the text "lychee".
 * If the text "lychee" is spellt differently accross the text (for instance, 
 * "litchi", or at the plural form "lychees"), it will still be attached the 
 * same label ("lychee").
 * @requires <a href="http://jquery.com/">jQuery</a>
 * @requires <a href="https://github.com/bmathern/jQuery-annotateTextarea">jQuery-annotateTextarea</a>
 * @param {String} html_id ID of the HTML element where which
 *     the Autocompleter will be attached to.
 * @param {Array.<Concept>} concepts Array of Concepts objects
 *     that will be proposed in the autocompletion list.
 */
var Autocompleter = function(html_id,concepts) {
	this.text_input_el = document.getElementById(html_id);
	this.type = this.text_input_el.tagName;
	this.debug = false;
	this.previous_text = this.text_input_el.value;
//console.log(this.type);
	this.suggestion = document.createElement("ul");
	this.suggestion.setAttribute("class","Autocompleter");
//	$(this.suggestion).data("autocompleter",this);
	$(this.text_input_el).after(this.suggestion);
	$(this.text_input_el).on('keydown',this.parse_key_down.bind(this));
	$(this.text_input_el).on('input',this.parse_input_event.bind(this));
	$(this.text_input_el).on('cut',this.set_big_change.bind(this));
	$(this.text_input_el).on('paste',this.set_big_change.bind(this));
//	$(this.text_input_el).on('select',this.set_big_change.bind(this));
	$(this.suggestion).on('click',this.click.bind(this));
	this.flag_big_change = false;
	this.annotations = [];
	if(this.type === "TEXTAREA") {
		$("#"+html_id).highlightTextarea({
			annotations: this.annotations,
			resizable: true,
			debug: this.debug //false
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
	log: function() { if(this.debug) console.log.apply(console,arguments); },
	update_highlight: function() {
		$(this.text_input_el).highlightTextarea('setAnnotations',this.annotations);
	},
	set_concepts: function(concepts) {
		this.concepts = concepts;
	},
	init: function(start_str) {
		this.flag_big_change = false;
		this.filter_annotations();
		str = start_str || '';
		this.current_selection = undefined;
		this.current_pos = undefined;
		this.values = this.concepts;
		this.predefined_concept = undefined;
		return this.narrow_input(str);
	},
	narrow_input: function(str) {
		this.start_with = str.toLowerCase(); // toLocalLowerCase(); // ?
		var added_values = [];
		var new_values = this.values.filter(function(concept) {
			return concept.text.some(function(t) {
				return t.indexOf(this.start_with) == 0;
			},this);
			//(concept.text.indexOf(this.start_with) == 0) || (concept.plural.indexOf(this.start_with) == 0);
		},this);
		this.values = new_values.concat(added_values);
		this.display();
		return (this.values.length > 0); // return true if some suggestions
	},
	display: function() {
//this.log("display - begin - "+(this.current_selection?this.current_selection.text:"undefined"));
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
				$("<li class=\""+concept.class+" "+concept.label+selected+"\"><strong>"+concept.text[0]+"</strong> ("+concept.class+")</li>").data("pos",pos_count).appendTo(this.suggestion);
			} else {
				$("<li class\""+selected+"\">"+concept.text[0]+"</li>").data("pos",pos_count).appendTo(this.suggestion);
			}
			pos_count++;
		},this);
		if(this.current_pos === undefined || selection_not_found) {
//this.log("nothing selected -> default behaviour");
			this.current_pos = undefined;
			this.current_selection = undefined;
			this.move_selection(1);
//this.log(this.current_
		}
//this.log("display - end - "+(this.current_selection?this.current_selection.text:"undefined"));
	},
	display_variations: function(word,word_class) {
		word = word.toLowerCase();
		this.concepts.forEach(function(concept) {
			if(concept.text.some(function(t) {
				return t.indexOf(word) === 0;
			},this)) {
				this.predefined_concept = concept;
			}
		},this);
		$(this.suggestion).empty();
		var selection_not_found = true;
		var pos_count = 0;
		this.predefined_concept.text.forEach(function(str,key) {
			var selected = '';
			if(str === this.current_selection) {
				selected = ' selected';
				selection_not_found = false;
				this.current_position = key;
			}
			if(this.predefined_concept.class !== undefined) {
				$("<li class=\""+this.predefined_concept.class+" "+this.predefined_concept.label+selected+"\"><strong>"+str+"</strong> ("+this.predefined_concept.class+")</li>").data("pos",pos_count).appendTo(this.suggestion);
			} else {
				$("<li class\""+selected+"\">"+str+"</li>").data("pos",pos_count).appendTo(this.suggestion);
			}
			pos_count++;
		},this);
		if(this.current_pos === undefined || selection_not_found) {
//this.log("nothing selected -> default behaviour");
			this.current_pos = undefined;
			this.current_selection = undefined;
			this.move_selection(1);
//this.log(this.current_
		}
//this.log("display - end - "+(this.current_selection?this.current_selection.text:"undefined"));
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
this.log("position "+this.current_pos);
		return false;
	},
	update_selection_from_pos: function() {
		if(this.current_pos === undefined) {
			this.current_selection = undefined;
		} else {
			if(this.predefined_concept !== undefined) {
				this.current_selection = this.predefined_concept.text[this.current_pos];
			} else {
				this.current_selection = this.values[this.current_pos];
			}
		}
		$(this.text_input_el).trigger("Autocompleter:selection",this.current_selection);
	},

	autocomp: function() {
//this.log(this.current_selection);
		if(this.current_selection === undefined) { return false; }
		if(this.predefined_concept === undefined) {
			var concept = this.current_selection;
		} else {
			
			var concept = this.predefined_concept;
			this.start_with = this.current_selection;	
		}
		var filtered_concept = {
			text: concept.text.filter(function(str) {
				return str.indexOf(this.start_with) == 0;
			},this),
			class: concept.class,
			label: concept.label
		};
	//	var sugg = $("#suggestions > li")[this.current_selection].innerHTML;
		$(this.text_input_el).trigger("Autocompleter:autocomplete",filtered_concept);
		return filtered_concept;
	},

	/* UI interaction - On key press */
	set_big_change: function() {
		this.log("big change");
		this.flag_big_change = true;
	},
	parse_input_event: function(e) {
		this.log("----> input event",e);
		var text = e.target.value;
		var pos_end_change = e.target.selectionStart;
		var offset =  text.length - this.previous_text.length;
		var test_eq = false;
		var no_autocomplete = false;
		this.log("previous text and text:",this.previous_text,text);
		if(this.flag_big_change) {
			this.log("flag big change detected");
			// a selection, cut or paste event has occurred
			// It is likely more than one character has been removed and/or added
			// FIND WHERE THE CHANGE STARTED:
			for(var p = 0; p < pos_end_change; p++) {
				this.log("p",p,pos_end_change,pos_end_change - offset);
				if(p == pos_end_change - offset +1) { break; }
				this.log("text compare",text[p],this.previous_text[p]);
				if(text[p] !== this.previous_text[p]) { break; }
			}
			var pos_start_change = p;
			no_autocomplete = this.is_end_of_annotation_at_pos(pos_start_change);
			this.flag_big_change = false;
		} else if(offset !== 1) {
			this.log("behaviour not expected: new text - old text length = "+offset);
		} else {
			// ok, this is expected behaviour: one character has been added, nothing deleted
			var offset_annotations = 1;
			var pos_start_change = pos_end_change - 1;
			if(pos_end_change-1 >= 0 && $.inArray(text[pos_end_change-1],this.word_sep) == -1) {
				test_eq = true;
			}
		}
this.log("unchanged text:",text.substr(0,pos_start_change),"new text:",text.substr(pos_start_change,pos_end_change-pos_start_change),"remaining text",text.substr(pos_end_change));
		this.annotations_update2(pos_start_change,pos_end_change,offset,test_eq);
		this.filter_annotations();
		
		var text_before_cursor = text.substr(0,pos_end_change);
		var word_pos = this.pos_of_word_start(text_before_cursor);
		var word = text_before_cursor.substr(word_pos);
this.log("word:",word);
		if(!no_autocomplete && this.parse_input(word)) {
			this.annotations.push({
						begin:word_pos,
						length:word.length,
						class:"autocomplete",
						label:""
					});
		}
		this.update_highlight();
		this.previous_text = text;
	},
	is_end_of_annotation_at_pos: function(pos) {
		return this.annotations.some(function(a){
				return a.begin + a.length === pos;
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
	annotations_update2: function(pos_start,pos_end,offset,test_eq) {
this.log("annotations_update2",pos_start,pos_end,offset,test_eq);
		// remove annotation if word is being edited
		if(test_eq) {
			this.annotations = this.annotations.filter(function(a) {
				return !((a.begin < pos_end-offset)&&(a.begin+a.length >= pos_start));
			})
		} else {
			this.annotations = this.annotations.filter(function(a) {
				return !((a.begin < pos_end-offset)&&(a.begin+a.length > pos_start));
			})
		}
		// move annotation to the right if after where text is inserted
		this.annotations = this.annotations.map(function(a) {
			if(a.begin >= pos_start) { a.begin += offset; }
			return a;
		})
	},
	click: function(e) {
		var data = $(e.target).closest('li').data('pos');
//		this.log(data);
		if(data !== null) {
			this.move_selection(data - this.current_pos);
			var concept = this.autocomp();
			if(concept !== false) {
				if(this.type === "TEXTAREA") { // TEXTAREA field
					var a;
					this.annotations.forEach(function(annot) {
						if(annot.class == "autocomplete") {
							a = annot;
						}
					});
//		this.log(a);
					if(a !== undefined) {
						// replace annotation by the selected concept
						var text = $(this.text_input_el).val();
//						this.log(text);

						// update the text field
						text = text.substr(0,a.begin) + concept.text[0] + text.substr(a.begin+a.length);
						$(this.text_input_el).val(text);
						this.previous_text = text;
						// add the annotation
						this.filter_annotations();
						this.annotations_update2(a.begin,a.begin+concept.text[0].length,concept.text[0].length-a.length,false);
						this.annotations.push({
							text: concept.text[0],
							begin:a.begin,
							length:concept.text[0].length,
							class:concept.class,
							label:concept.label
						});
						this.init();
						this.update_highlight();
					}
				} else { // INPUT field
					$(this.text_input_el).val(concept.text[0]);
					this.init();
				}
			}			
		}
	},
	parse_key_down: function(e) {
		var return_value = true;
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
				break;
			case 38: //up arrow   
				return_value = this.up();
				break; 
			case 40: //down arrow     
				return_value = this.down(); 
				break;                 
			case 13: //enter
			case 9: //tab    
				var concept = this.autocomp();
				var pos = e.target.selectionEnd;
				if(concept !== false) {
		this.log("----> concept",concept);
					var text = e.target.value;
					var text_before_cursor = text.substr(0,pos);
					var text_after_cursor = text.substr(pos);
					
					var word_pos = this.pos_of_word_start(text_before_cursor);
					var word = text_before_cursor.substr(word_pos);
					var is_capitalised = (word[0] != word[0].toLowerCase());

					var new_word = concept.text[0];
					if(is_capitalised) {
						new_word = new_word[0].toUpperCase() + new_word.substr(1);
					}
this.log("new_word",new_word);
					var new_text =  text.substr(0,word_pos)+new_word+text_after_cursor;
					e.target.value = new_text;
					this.previous_text = new_text;
					annot = { 
						text: new_word,
						begin: word_pos,
						length: new_word.length,
						label: concept.label,
						class: concept.class
					};

					return_value = false;
				} else if(this.is_end_of_annotation_at_pos(pos)) {
					//TODO UPDATE ANNOTATION
console.log("autocomplete has been pressed at the end of an annotation.");
					var word,word_class;
					this.annotations.forEach(function(a) {
						if(a.begin+a.length === pos) {
							word = a.text;
							word_class = a["class"];
	console.log(a,word_class);
						}
					});
					this.annotations_update2(pos,pos,0,true);
					this.display_variations(word,word_class);
					return_value = false;
				}
				if(new_word !== undefined) {
					var offset = new_word.length - word.length;
	this.log("offset",offset);
					var test_eq = false;
					this.annotations_update2(pos,pos+offset,offset,test_eq);
					this.filter_annotations();
					if(annot !== undefined && annot.label !== undefined) {
	this.log("annot",annot);
						var pos_selection = word_pos+new_word.length;
						e.target.selectionStart = pos_selection;
						e.target.selectionEnd = pos_selection;
						this.annotations.push(annot);
						this.init();
					}
					var test_eq = true;
					//if(pos_end_change-1 >= 0 && $.inArray(text.substr(pos_end_change-1,1),this.word_sep)) {
					//	test_eq = false;
					//}
					this.update_highlight();
	this.log("annotations",this.annotations);
				}
				break;
			case 8: //backspace
			case 46: //delete
				this.set_big_change();
				break;   
			default:
				var selection_len = e.target.selectionEnd - e.target.selectionStart;
				if(selection_len !== 0) { this.set_big_change(); }
				break;
		}
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
	pos_of_word_start: function(text) {
		var max = 0;
		var array_pos = this.word_sep.forEach(function(c) {
			var pos = text.lastIndexOf(c) + 1; // si -1, alors, pas trouvé et donc la formule tient.
			if(pos>max) {max = pos;}
		});
		return max;
	},
};

