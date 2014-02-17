/*
TODO: dans edit/new -> mettre les ingredients dans un tableau
*/
// Recipes Class
function Recipe(recipe) {
	if(recipe !== undefined) {
		this.load(recipe);
	}
};
Recipe.prototype = {
	meta: {
		"prep-time-unit":	"min",
		"cooking-time-unit":	"min",
	},
	ingredients: [],
	preparation: [],
	add_text: function(text) {
		var last_inst = this.preparation[this.preparation.length-1];
		if(last_inst && last_inst.type == "text") {
			last_inst.content += text;
		} else {
			this.preparation.push({type: "text", content: text});
		}
	},
	add_annotation: function(text,type,label) {
		this.preparation.push({type: "annotation", content: text, label: label, class: type});
	},
	add_ingredient: function(text,label,qtt,unit) {
		if(this.ingredients.some(function(i) {return i.label == label;})) {
			return false;
		} else {
			var ingr = {
				qtt: 0,	unit: 'n/a',
				ingredient:	text,
				label: label
			}
			qtt?ingr.qtt=qtt:null;
			unit?ingr.unit=unit:null;
			this.ingredients.push(ingr);
			return true;
		}
	},
	stringify: function() {
		var new_recipe = {};
		new_recipe.title = this.title;
		new_recipe.meta = this.meta;
		new_recipe.ingredients = this.ingredients;
		new_recipe.preparation = this.preparation;
	//	console.log(new_recipe);
		return JSON.stringify(new_recipe)
	},
	load: function(recipe) {
		this.title = recipe.title;
		this.meta = recipe.meta;
		this.ingredients = recipe.ingredients;
		this.preparation = recipe.preparation;
	}
}


// DOM_Create
var DOM_Create = {
	text: function(parent_el,text) {
		var el = document.createTextNode(text);
		parent_el.appendChild(el);
		return el;
	},
	element: function(tagName,parent_el,opt) {
		var el = document.createElement(tagName);
		if(opt) {
			if(opt.el) {
				el.appendChild(opt.el);
			} else {
				opt.id?el.setAttribute('id',opt.id):null;
				opt.class?el.setAttribute('class',opt.class):null;
				var text = document.createTextNode(opt.content || '');
				el.appendChild(text);
			}
		}
		parent_el.appendChild(el);
		return el;
	}
};



// RecipeUI
var RecipeUI = function(recipe) {
	this.recipe = new Recipe(recipe);
	this.set_language("en"); // default language
	this.build_concepts();
	this.init_events();
};


RecipeUI.prototype = {

	set_language: function(lang) {
		switch(lang) {
			case "fr":
				this.lang = {
					__lang__:		"fr",
					"meta":			"Infos",
					"meta-prep":			"Préparation : ",
					"meta-cooking":			"Cuisson : ",
					"meta-difficulty":		"Difficulté : ",
					"meta-budget":			"Budget : ",
					"meta-servings":		"Service : ",
					"meta-servings-before":	"Pour ",
					"meta-servings-after":	" personnes",
					"ingredients":	"Ingrédients",
					"preparation":	"Préparation",
				};
				break;
			case "en":
			default:
				this.lang = {
					__lang__:		"en",
					"meta":			"Infos",
					"meta-prep":			"Preparation: ",
					"meta-cooking":			"Cooking: ",
					"meta-difficulty":		"Difficulty: ",
					"meta-budget":			"Budget: ",
					"meta-servings":		"Servings: ",
					"meta-servings-before":	"For ",
					"meta-servings-after":	" people",
					"ingredients":	"Ingredients",
					"preparation":	"Preparation",
				};
				break;
		}
	},

	build_concepts: function() {
		function generate_concepts(s_array,cat) {
			return s_array.map(function(str) {
				var lbl = str.replace(/\s|[']/g,"_");
				return {text: str, plural: str+"s", label: lbl, class: cat};
			});
		}
		list_ingr = [
			"asperge",
			"carotte", "chocolat", "crème fraîche",
			"huile d'olive",
			"lait",
			"oeuf", "oignon",
			"poire", "poivre", "poivron",
			"sel", "sucre",
			"tomate"
		];
		list_ust = [
			"batteur",
			"fouet", "four",
			"moule",
			"verrine"
		];
		list_words = [
			"ajoutez","mélangez","laissez reposer",
		];
		this.concepts = [];
		this.ingredients = generate_concepts(list_ingr,"ingredient");
		// add ingredients that are already in the recipe.
		this.recipe.ingredients.forEach(function(i) {
			this.ingredients.push({text: i.ingredient, plural: i.ingredient, label: i.label, class: "ingredient"})
		},this);
		this.other_concepts = [].concat(generate_concepts(list_ust,"ustensile"));
		this.other_concepts = this.other_concepts.concat(generate_concepts(list_words,undefined));
		this.concepts = this.ingredients.concat(this.other_concepts);
	//	this.update_concepts();
	},
	update_concepts: function() {
		this.concepts = this.ingredients.concat(this.other_concepts);
		this.autocomplete_prep.set_concepts(this.concepts);
		this.autocomplete_ingr.set_concepts(this.ingredients);
	},

	add_ingredient: function(text,label,qtt,unit) {
		if(this.recipe.add_ingredient(text,label,qtt,unit)) {
			var li = DOM_Create.element('li',document.getElementById('ingredient-list'));
			if(qtt && qtt != 0) {
				DOM_Create.element('span',li,{class: 'quantity',content: qtt});
				DOM_Create.text(li,' ');
				if(unit && unit != 'n/a') {
					DOM_Create.element('span',li,{class: 'unit',content: unit});
					DOM_Create.text(li,' de ');
				}
			}
			DOM_Create.element('span',li,{class: 'ingredient '+label,content: text});
		}
	},
	add_text: function(text) {
		var text_node = document.createTextNode(text);
		this.current_step.appendChild(text_node);
		this.recipe.add_text(text);
	},

	get_meta: function() {
		this.recipe.title = $("#title").val();
		this.recipe.meta['prep-time'] = $("#prep-time").val();
		this.recipe.meta['cooking-time'] = $("#cooking-time").val();
		this.recipe.meta.budget = $("#budget").val();	
		this.recipe.meta.difficulty = $("#difficulty").val();	
		this.recipe.meta.servings = $("#servings").val();
	},
	parse_prep: function() {
		var prep = [];
		var annotations = this.autocomplete_prep.annotations.sort(function(a,b) {
			return a.begin > b.begin;
		});
		var text = $(this.autocomplete_prep.text_input_el).val();
		var prev_pos = 0;
		annotations.forEach(function(a) {
			if(a.begin > prev_pos) {
				prep.push({type: "text", content: text.substr(prev_pos,a.begin-prev_pos)});
			}
			prep.push({type: "annotation", content: a.text, label: a.label, class: a.class});
			prev_pos = a.begin + a.length;
		});
		if(prev_pos < text.length) {
			prep.push({type: "text", content: text.substr(prev_pos)});
		}
		this.recipe.preparation = prep;
	},

	/*
	 * EVENT HANDLING METHODS
	 */
	init_events: function() {
		// INIT THE EVENT LISTENERS
		$('body').on('submit',"#recipe_form",this.prevent_default.bind(this));
	//	$("#prep").on('keypress',this.on_event_key.bind(this));
		$('body').on('keypress',"#qtt_input",this.on_event_space.bind(this));
		$('body').on('keypress',"#unit_input",this.on_event_space.bind(this));

		$('body').on('Autocompleter:autocomplete',"#prep-text",this.on_event_add_annotation.bind(this));
		$('body').on('click',"#add_ingredient",this.on_event_add_ingredient.bind(this));
		$('body').on('submit',"#ingredient_input",this.on_event_add_ingredient.bind(this));
		$('body').on('click',"#save",this.on_event_save.bind(this));


		// SAME INGREDIENT IS HIGHLIGHTED
		var that = this;
		function makeToggleClass(addClass,type) {
			var method = addClass?"addClass":"removeClass";
			return function(e) {
				// Pour chaque ingrédient de la liste, on regarde si
				// l'ingrédient survolé correspond à cet ingrédient
				that[type+"s"].forEach(function(concept) {
					var ing = concept.text;
					if( $(this).hasClass(ing) ) {
						$('.'+ing)[method](type+'-hover');
					}
				},this);
				return false;
			}
		}

		// Utilisation de jQuery pour écouter l'événement "mouseenter"
		// sur les balises qui possèdent la classe "ingredient"
		$('body').on('mouseenter','.ingredient',makeToggleClass(true,"ingredient"));
		$('body').on('mouseleave','.ingredient',makeToggleClass(false,"ingredient"));
	//	$('body').on('mouseenter','.ustensile',makeToggleClass(true,"ustensile"));
	//	$('body').on('mouseleave','.ustensile',makeToggleClass(false,"ustensile"));
	},

	// event related functions
	prevent_default: function(e) {
		e.preventDefault;
		return false;
	},
	on_event_save: function(e) {
		this.autocomplete_prep.init();
		this.get_meta();
		this.parse_prep();
		// save on server side

		$.post('save.php',{"recipe": this.recipe.stringify()})

/* 		// save as file		
		// from http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
		var a = window.document.createElement('a');
		a.href = window.URL.createObjectURL(new Blob([this.recipe.stringify()], {type: 'text/json'}));
		a.download = recipe.title==undefined?'recipe.json':this.recipe.title+'.json';
		// Append anchor to body.
		document.body.appendChild(a);
		a.click();
		// Remove anchor from body
		document.body.removeChild(a);
// */

	},
	on_event_add_ingredient: function(e,d) {
console.log("here");
		var qtt = $("#qtt_input").val();
		qtt = qtt==''?undefined:qtt;
		var unit = $("#unit_input").val();
		unit = unit==''?undefined:unit;
		var label, text;
		text = $("#ingredient_input").val().toLowerCase();
		if(d) {
			label = d.label;
		} else {
			var concept = this.ingredients.find(function(c) {
				return (text == c.text)||(text == c.plural);
			});
			if(concept === undefined) { // if ingredient not already in this.ingredients
				// adds to this.ingredients
				label = text;
				this.ingredients.push({text: text, plural: text, label: text, class: "ingredient"});
				this.update_concepts();
			} else {
				text = concept.text;
				label = concept.label;
			}
		}
		this.autocomplete_ingr.init();
		this.add_ingredient(text,label,qtt,unit);
		$("#qtt_input").val('');
		$("#unit_input").val('');
		$("#ingredient_input").val('');
		$("#qtt_input").focus();
		e.preventDefault;
		return false;
	},
	on_event_add_annotation: function(e,d) {
		if(d.class !== undefined) {
			this.recipe.add_annotation(d.text,d.class,d.label);
			if(d.class == 'ingredient') {
				this.add_ingredient(d.text,d.label);
			}
		}
		e.preventDefault;
		return false;
	},
	on_event_space: function(e) {
		if(e.which == 32) { // space
			if(e.target.id == "qtt_input") {
				$("#unit_input").focus();
			} else {
				$("#ingredient_input").focus();
			}
			return false;
		}
	},


	/*
	 * METHODS GENERATING HTML CONTENT FOR THE RECIPE
	 */
	generate_html: function(html_id,mode_edit) {
		var recipe_div = document.getElementById(html_id);
		this.generate_html_title(recipe_div,mode_edit);

		var col1 = DOM_Create.element('div',recipe_div,{class: 'col-sm-6'});
		DOM_Create.element('h3',col1,{content: this.lang.meta});
		this.generate_html_meta(col1,mode_edit);

		DOM_Create.element('h3',col1,{content: this.lang.ingredients});
		this.generate_html_ingredients(col1,mode_edit);

		var col2 = DOM_Create.element('div',recipe_div,{class: 'col-sm-6'});
		DOM_Create.element('h3',col2,{content: this.lang.preparation});
		this.generate_html_prep(col2,mode_edit);

		if(mode_edit) {
			$('<button id="save">save</button>').appendTo(recipe_div);

			// LOADS STUFF
			this.autocomplete_prep = new Autocompleter("prep-text",[]);
			this.autocomplete_ingr = new Autocompleter("ingredient_input",[]);

			this.update_concepts();

			var pos=0;
			this.recipe.preparation.forEach(function(slice) {
				if(slice.type === "annotation") {
					this.autocomplete_prep.annotations.push({
						text: slice.content,
						label: slice.label,
						class: slice.class,
						begin: pos,
						length: slice.content.length
					});
				}
				pos += slice.content.length;
			},this);
			this.autocomplete_prep.update_highlight();
		}
	
	},
	generate_html_form: function(html_id) {
		this.generate_html(html_id,true);
	},
	generate_html_title: function(parent_el,mode_edit) {
		if(mode_edit) {
			parent_el = DOM_Create.element('form',parent_el,{id: "recipe_form", class: "form-horizontal"});
			parent_el.setAttribute("role","form");
			var title = (this.recipe.title===undefined)?"":this.recipe.title;
			$('<h2><input type="text" id="title" name="title" class="form-control input-lg" placeholder="Recipe title..." value="'+title+'"/></h2>').appendTo(parent_el);
		} else {
			DOM_Create.element('h2',parent_el,{content: this.recipe.title});
		}
	},
	generate_html_meta: function(parent_el,mode_edit) {
		var r = this.recipe;
		function m(type) {
			return (r.meta[type] === undefined)?"":r.meta[type];
		}
		if(mode_edit) {
			var div =  DOM_Create.element('div',parent_el,{class: "form-group"});
			var dl = DOM_Create.element('dl',parent_el,{class: "dl-horizontal"});
			$("<dt>"+this.lang["meta-prep"]+"</dt>").appendTo(dl);
			$('<dd><div class="col-xs-6 no-gutter"><input type="text" id="prep-time" name="prep-time" size="2" class="form-control" value="'+m('prep-time')+'"></div><div class="col-xs-6">min</div></dd>').appendTo(dl);
			$("<dt>"+this.lang["meta-cooking"]+"</dt>").appendTo(dl);
			$('<dd><div class="col-xs-6 no-gutter" no-gutter><input type="text" id="cooking-time" name="cooking-time" size="2" class="form-control" value="'+m('cooking-time')+'"></div><div class="col-xs-6">min</div></dd>').appendTo(dl);
			$("<dt>"+this.lang["meta-difficulty"]+"</dt>").appendTo(dl);
			$('<dd><input type="text" id="difficulty" name="difficulty" size="16" class="form-control" value="'+m('difficulty')+'"></dd>').appendTo(dl);
			$("<dt>"+this.lang["meta-budget"]+"</dt>").appendTo(dl);
			$('<dd><input type="text" id="budget" name="budget" size="16" class="form-control" value="'+m('budget')+'"></dd>').appendTo(dl);
			$("<dt>"+this.lang["meta-servings"]+"</dt>").appendTo(dl);
			$('<dd><div class="col-xs-3">'+this.lang["meta-servings-before"]+'</div><div class="col-xs-3 no-gutter"><input type="text" id="servings" name="servings" size="2" class="form-control" value="'+m('servings')+'"></div><div class="col-xs-6">'+this.lang["meta-servings-after"]+'</div></dd>').appendTo(dl);
		} else {
			var ul = DOM_Create.element('ul',parent_el);
			var m_array = [];
			m_array.push(this.lang["meta-prep"] + m('prep-time') + ' ' + m('prep-time-unit'));
			m_array.push(this.lang["meta-cooking"] + m('cooking-time') + ' ' + m('cooking-time-unit'));
			m("difficulty")?m_array.push(this.lang["meta-difficulty"] +m("difficulty")):null;
			m("budget")?m_array.push(this.lang["meta-budget"] +m("budget")):null;
			m("servings")?m_array.push(this.lang["meta-servings-before"] +m("servings")+this.lang["meta-servings-after"]):null;
			if(m.comments) {
				m.comments.forEach(function(c) {
					m_array.push(c);
				});
			}
			m_array.map(function(s) {
				//var li = DOM_Create.element('li',ul,{"class": "list-group-item"});
				var li = DOM_Create.element('li',ul);
				DOM_Create.text(li,s);
			});
		}
	},
	generate_html_ingredients: function(parent_el,mode_edit) {
		//var ul = DOM_Create.element('ul',parentEl,{"class": "list-group"});
		var opt = mode_edit?{id:"ingredient-list"}:{};
		var ul = DOM_Create.element('ul',parent_el,opt);
		this.recipe.ingredients.map( function(i) {	
			//var li = DOM_Create.element('li',ul,{"class": "list-group-item"});
			var li = DOM_Create.element('li',ul);
			var i_string = '';
			if(i.qtt != 0) {
				DOM_Create.element('span',li,{class: 'quantity',content: i.qtt});
				DOM_Create.text(li,' ');
				if(i.unit != 'n/a') {
					DOM_Create.element('span',li,{class: 'unit',content: i.unit});
					DOM_Create.text(li,' de ');
				}
			}
			DOM_Create.element('span',li,{class: 'ingredient '+i.label,content: i.ingredient});
			// i.comments
		});
		if(mode_edit) {
			$('<ul><li><input type="text" name="qtt" id="qtt_input" size="2"/><input type="text" name="unit" id="unit_input" size="2"/> of <input type="text" name="ingredient" id="ingredient_input"/><button id="add_ingredient">+</button></li></ul>').appendTo(parent_el)
		}
	},
	generate_html_prep: function(parent_el,mode_edit) {
		var opt = mode_edit?{id:"steps"}:{};
		var container = DOM_Create.element('div',parent_el,opt);
		// TODO: sort annotations
		
		if(mode_edit) {
			container = DOM_Create.element('textarea',container,{id: "prep-text", class: "form-control"});
			container.setAttribute("style","width:370px;height:200px;");
		//	container.setAttribute("rows","3");
		}
		this.recipe.preparation.forEach(function(item) {
			if(item.type == 'annotation' && !mode_edit) {
				DOM_Create.element('span',container,{content: item.content, class: item.class + ' ' + item.label});
			} else {
				DOM_Create.text(container,item.content);
			}
		});
	}
};


