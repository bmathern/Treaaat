/*
TODO: dans edit/new -> mettre les ingredients dans un tableau
TODO: gérer les images: ajouter un formulaire "file" caché. Ajouter un champ pour les descriptions
TODO: gérer l'envoi de la recette non pas via Ajax, mais via une requête normale HTML submit (le save.php est presque prêt -> c'est la partie JS qu'il faut travailler (avec des champs input hidden).
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
	images: [],
	comments: [],
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
	update_ingredient: function(i,pos) {
		i.qtt = i.qtt?i.qtt:0;
		i.unit = i.unit?i.unit:'n/a';
		this.ingredients[pos] = i;
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
		this.images = recipe.images || [];
		this.comments = recipe.comments || [];
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
	this.edited = false;
};


RecipeUI.prototype = {

	set_language: function(lang) {
		switch(lang) {
			case "fr":
				this.lang = {
					__lang__:		"fr",
					"title":	"Titre : ",
					"recipe-title":	"Titre de la recette...",
					"meta":			"Infos",
					"meta-prep":			"Préparation : ",
					"meta-cooking":			"Cuisson : ",
					"meta-difficulty":		"Difficulté : ",
					"meta-budget":			"Budget : ",
					"meta-servings":		"Service : ",
					"meta-servings-before":	"Pour ",
					"meta-servings-after":	" personnes",
					"ingredients":	"Ingrédients",
					"ingredient-of": "de",
					"preparation":	"Préparation",
					"save":	"Sauvegarder",
					"comments": "Commentaires",
					"comment-content": "Commentaire : ",
					"comment-user": "Nom d'utilisateur : ",
					"comment-submit": "Envoyer",
				};
				break;
			case "en":
			default:
				this.lang = {
					__lang__:		"en",
					"title":	"Title: ",
					"recipe-title":	"Recipe title...",
					"meta":			"Infos",
					"meta-prep":			"Preparation: ",
					"meta-cooking":			"Cooking: ",
					"meta-difficulty":		"Difficulty: ",
					"meta-budget":			"Budget: ",
					"meta-servings":		"Servings: ",
					"meta-servings-before":	"For ",
					"meta-servings-after":	" people",
					"ingredients":	"Ingredients",
					"ingredient-of": "of",
					"preparation":	"Preparation",
					"save":	"Save",
					"comments": "Comments",
					"comment-content": "Comment: ",
					"comment-user": "User name : ",
					"comment-submit": "Submit",
				};
				break;
		}
	},
	set_edited: function() {
		if(this.edited === false) {
			this.edited = true;
			$('#save').removeClass('btn-success');
			$('#save').addClass('btn-danger');
		}
	},

	build_concepts: function() {
		function generate_concepts(s_array,cat) {
			return s_array.map(function(arr) {
				if(typeof(arr) === "string") {
					arr = [arr, arr+"s"];
				}
				var lbl = arr[0].replace(/\s|[']/g,"_");
				return {text: arr, label: lbl, class: cat};
			});
		}
		list_ingr = [
			"asperge",
			["beurre","beurré","beurrée"],
			"carotte", "chocolat", ["crème fraîche"],
			["huile d'olive"],
			["lait"],
			["oeuf","oeufs","œuf","œufs"], ["oignon","oignons","onion","onions"],
			"poire", ["poivre","poivres","poivrer","poivrez","poivré","poivrés","poivrée","poivrées"], "poivron",
			["sel","sels","saler","salez","salé","salés","salée","salées"], ["sucre","sucres","sucrer","sucrez","sucré","sucrés","sucrée","sucrées"],
			"tomate"
		];
		list_ust = [
			"batteur","bol",
			"casserole",["couteau","couteaux"],
			"fouet", "four","fourchette",
			"moule",
			"poêle",
			"saladier",
			"verrine"
		];
		list_words = [
			["ajouter","ajoutez"],
			["enfourner","enfournez"],
			["laisser reposer","laissez reposer"],
			["mélanger","mélangez"],
			["préchauffer","préchauffez"],
			["th 6 (180°C)","thermostat 6 (180°C)"],
			["th 7 (210°C)","thermostat 7 (210°C)"],
		];
		this.concepts = [];
		this.ingredients = generate_concepts(list_ingr,"ingredient");
		// add ingredients that are already in the recipe.
		this.recipe.ingredients.forEach(function(i) {
			this.ingredients.push({text: [i.ingredient], label: i.label, class: "ingredient"})
		},this);
		this.other_concepts = [].concat(generate_concepts(list_ust,"ustensile"));
		this.other_concepts = this.other_concepts.concat(generate_concepts(list_words,undefined));
		this.concepts = this.ingredients.concat(this.other_concepts);
	//	this.update_concepts();
	},
	update_concepts: function() {
		this.concepts = this.ingredients.concat(this.other_concepts);
		this.autocomplete_prep.set_concepts(this.concepts);
		//this.autocomplete_ingr.set_concepts(this.ingredients);
	},

	add_ingredient: function(text,label,qtt,unit) {
		if(this.recipe.add_ingredient(text,label,qtt,unit)) {
			var ul = document.getElementById('ingredient-list');
			var li = DOM_Create.element('li',ul);
			this.generate_html_ingredient_line(li,true,{ingredient:text,label:label,qtt:qtt,unit:unit});
		}
		$('body').trigger('recipe:ingredient:add',{text:text,label:label,qtt:qtt,unit:unit});
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
		$('body').on('keypress',".qtt_input",this.on_event_space.bind(this));
		$('body').on('keypress',".unit_input",this.on_event_space.bind(this));

		$('body').on('Autocompleter:autocomplete',"textarea#prep-text",this.on_event_add_annotation.bind(this));
		$('body').on('click',"#add_ingredient",this.on_event_add_ingredient.bind(this));
		$('body').on('submit',".ingredient_input",this.on_event_add_ingredient.bind(this));
		$('body').on('click',"#save",this.on_event_save.bind(this));
		$('body').on('change',"#pictures",this.on_event_add_image.bind(this));
		$('body').on('click','.ingredient-edit',this.on_event_edit_ingredient.bind(this));
		$('body').on('click','.ingredient-save',this.on_event_save_ingredient.bind(this));
		$('body').on('click','.ingredient-del',this.on_event_remove_ingredient.bind(this));
		$('body').on('input','input,textarea',this.set_edited.bind(this));
		$('body').on('click','.ingredient-del',this.set_edited.bind(this));

		// SAME INGREDIENT IS HIGHLIGHTED
		var that = this;
		function makeToggleClass(addClass,type) {
			var method = addClass?"addClass":"removeClass";
			return function(e) {
				// Pour chaque ingrédient de la liste, on regarde si
				// l'ingrédient survolé correspond à cet ingrédient
				that[type+"s"].forEach(function(concept) {
					var ing = concept.label;
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
		$('body').trigger('recipe:save');
		this.autocomplete_prep.init();
		this.get_meta();
		this.parse_prep();
		// save on server side

		$.post('save.php',{"recipe": this.recipe.stringify()},this.on_save_success.bind(this));

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
	on_save_success: function(data,text,jqXHR) {
		this.edited = false;
		$('#save').removeClass('btn-danger');
		$('#save').addClass('btn-success');
	},
	on_event_add_ingredient: function(e,d) {
		var i = this.parse_ingredient_form(e);
		this.add_ingredient(i.ingredient,i.label,i.qtt,i.unit);
		$(".qtt_input",li).val('');
		$(".unit_input",li).val('');
		$(".ingredient_input",li).val('');
		$(".qtt_input",li).focus();
		e.preventDefault;
		return false;
	},
	on_event_remove_ingredient: function(e) {
		var li = $(e.target).closest('li');
		var pos = this.walk_dom_get_item_num(li);
		console.log(pos);
		this.recipe.ingredients = this.recipe.ingredients.filter(function(i,key) {
			return key !== pos;
		});
		li.remove();
	},
	walk_dom_get_item_num: function(el) {
		var count = 0;
		while(el.prev().length !== 0) {
			el = el.prev();
			count++;
			//if(count > 20) { ok = false; }
		}
		return count;
	},
	on_event_edit_ingredient: function(e) {
		$('#ingredient-add-form').css('visibility','hidden');
		var li = $(e.target).closest('li');
		var pos = this.walk_dom_get_item_num(li);
		var ingr = this.recipe.ingredients[pos];
		li.empty();
		this.generate_html_ingredient_form(li,ingr);
		//li.select('ingredient-save').css('visibility','visible');
		//$('.ingredient-edit',li).css('visibility','hidden');
	},
	on_event_save_ingredient: function(e,d) {
		var li = $(e.target).closest('li');
		var pos = this.walk_dom_get_item_num(li);
		var i = this.parse_ingredient_form(e,d);
		li.empty();
		this.recipe.update_ingredient(i,pos);
		this.generate_html_ingredient_line(li[0],true,i);
		//$('body').trigger('recipe:ingredient:add',{text:text,label:label,qtt:qtt,unit:unit});
		if($('.ingredient_input').length === 1) {
			$('#ingredient-add-form').css('visibility','visible');
		} else { console.log($('.ingredient_input')); }
	},
	parse_ingredient_form: function(e,d) {
		var li = $(e.target).closest('li');
		var qtt = $(".qtt_input",li).val();
		qtt = qtt==''?undefined:qtt;
		var unit = $(".unit_input",li).val();
		unit = unit==''?undefined:unit;
		var label, text;
		text = $(".ingredient_input",li).val().toLowerCase();
		if(d) {
			label = d.label;
		} else {
			var concept;
			this.ingredients.forEach(function(c) {
				c.text.forEach(function(t) {
					if(text.toLowerCase() == t) { concept = c; }
				});
			});
			if(concept === undefined) { // if ingredient not already in this.ingredients
				// adds to this.ingredients
				label = text.replace(/\s|[']/g,"_");;
				this.ingredients.unshift({text: [text], label: label, class: "ingredient"});
				this.update_concepts();
			} else {
				text = text;
				label = concept.label;
			}
		}
		//this.autocomplete_ingr.init();
		return {ingredient: text,label:label,qtt:qtt,unit:unit};
	},
	on_event_add_image: function(e,d) {
console.log("on_event_add_image",e);
		// Adapted from http://www.html5rocks.com/en/tutorials/file/dndfiles/
		var files = e.target.files;

		// Loop through the FileList and render image files as thumbnails.
		for (var i = 0, f; f = files[i]; i++) {

			// Only process image files.
			if (!f.type.match('image.*')) {
				continue;
			}

			var reader = new FileReader();

			// Closure to capture the file information.
			reader.onload = (function(theFile) {
				var key = 0;
				return function(e) {
					$('<li class="media"><div class="pull-left"><img src="'+e.target.result+'" class="media-object thumb"></img></div><div class="media-body"><input type="text" id="picture-'+key+'" name="picture-'+key+'" class="form-control col-xs-8" title="'+escape(theFile.name)+'" placeholder="Image description..." /></div></li>').appendTo("#pictures-list");
					// Render thumbnail.
/*					var span = document.createElement('span');
					span.innerHTML = ['<img class="thumb" src="', e.target.result,
								'" title="', escape(theFile.name), '"/>'].join('');
					document.getElementById('pictures-list').insertBefore(span, null);*/
				};
			})(f);

			// Read in the image file as a data URL.
			reader.readAsDataURL(f);
		}
		e.preventDefault;
		return false;
	},
	on_event_add_annotation: function(e,d) {
		if(d.class !== undefined) {
			this.recipe.add_annotation(d.text,d.class,d.label);
			if(d.class == 'ingredient') {
				var ingredient_text;
				this.ingredients.forEach(function(c) {
					if(c.label === d.label) { ingredient_text = c.text[0] };
				});
				this.add_ingredient(ingredient_text,d.label);
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

//		this.generate_html_image(recipe_div,mode_edit);

		var row1 = DOM_Create.element('div',recipe_div,{class: 'row'});
		var col1 = DOM_Create.element('div',row1,{class: 'col-sm-6'});
		this.generate_html_meta(col1,mode_edit);

		this.generate_html_ingredients(col1,mode_edit);

		var col2 = DOM_Create.element('div',row1,{class: 'col-sm-6'});
		this.generate_html_prep(col2,mode_edit);

		var row2 = DOM_Create.element('div',recipe_div,{class: 'row'});
		if(mode_edit) {
			$('<button id="save" class="btn btn-success">'+this.lang['save']+'</button>').appendTo(row2);

			// LOADS STUFF
			this.autocomplete_prep = new Autocompleter("prep-text",[]);
			//this.autocomplete_ingr = new Autocompleter("ingredient_input",[]);

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
	
		this.generate_html_comments(row2,mode_edit);
	},
	generate_html_form: function(html_id) {
		this.generate_html(html_id,true);
	},
	generate_html_title: function(parent_el,mode_edit) {
		if(mode_edit) {
			parent_el = DOM_Create.element('form',parent_el,{id: "recipe_form", class: "form-horizontal"});
			parent_el.setAttribute("role","form");
			var title = (this.recipe.title===undefined)?"":this.recipe.title;
			$('<h2>'+this.lang['title']+'<input type="text" id="title" name="title" class="form-control input-lg" placeholder="'+this.lang['recipe-title']+'" value="'+title+'"/></h2>').appendTo(parent_el);
		} else {
			DOM_Create.element('h2',parent_el,{content: this.recipe.title});
		}
	},
	generate_html_image: function(parent_el,mode_edit) {
		var parent_el = DOM_Create.element('div',parent_el,{class: 'img-zone'});
		if(mode_edit) {		
			this.recipe.images.forEach(function(img,key) {
				$('<div><img src="'+img.url+'"></img><input type="text" id="picture-'+key+'" name="picture-'+key+'" class="form-control" placeholder="Image description..." value="'+img.description+'"/></div>').appendTo(parent_el);
			});
console.log(this);
			$('<ul id="pictures-list" class="media-list"></ul>').appendTo(parent_el);
			$('<p>Insert an image: <input type="file" id="pictures" name="pictures[]" class="form-control"/></p>').appendTo(parent_el);
		} else {
			this.recipe.images.forEach(function(img) {
				$('<img src="'+img.url+'"></img>').appendTo(parent_el);
			});
		}
	},
	generate_html_meta: function(parent_el,mode_edit) {
		var parent_el = DOM_Create.element('div',parent_el,{class: 'meta-zone'});
		DOM_Create.element('h3',parent_el,{content: this.lang.meta});
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
		var parent_el = DOM_Create.element('div',parent_el,{class: 'ingr-zone'});
		DOM_Create.element('h3',parent_el,{content: this.lang.ingredients});
		//var ul = DOM_Create.element('ul',parentEl,{"class": "list-group"});
		var ul, li;
		var opt = mode_edit?{id:"ingredient-list"}:{};
		ul = DOM_Create.element('ul',parent_el,opt);
		this.recipe.ingredients.forEach( function(i) {
			li = DOM_Create.element('li',ul);
			this.generate_html_ingredient_line(li,mode_edit,i);	
		},this);
		if(mode_edit) {
			ul = DOM_Create.element('ul',parent_el);
			li = DOM_Create.element('li',ul,{id: 'ingredient-add-form'});
			this.generate_html_ingredient_form(li);
		}
	},
	generate_html_ingredient_form: function(parent_el,i) {
		var edit = true;
		if(i === undefined) {
			i = {ingredient: '',unit:'',qtt:''};
			edit = false;
		} else {
			if(i.unit==="n/a") { i.unit = '' };
			if(i.qtt===0) { i.qtt = '' };
		}
		$('<input type="text" name="qtt" class="qtt_input" size="2" value="'+i.qtt+'"/><input type="text" name="unit" class="unit_input" size="2" value="'+i.unit+'"/> ('+this.lang['ingredient-of']+') <input type="text" name="ingredient" class="ingredient_input" value="'+i.ingredient+'"/>').appendTo(parent_el);
		if(edit) {
			$('<button class="ingredient-save">ok</button>').appendTo(parent_el);
		} else {
			$('<button id="add_ingredient">+</button>').appendTo(parent_el);
		}
	},
	generate_html_ingredient_line: function(li,mode_edit,i) {
		//var li = DOM_Create.element('li',ul,{"class": "list-group-item"});
		var i_string = '';
		if(i.qtt !== 0 && i.qtt !== undefined) {
			DOM_Create.element('span',li,{class: 'quantity',content: i.qtt});
			DOM_Create.text(li,' ');
			if(i.unit !== 'n/a' && i.unit !== undefined) {
				DOM_Create.element('span',li,{class: 'unit',content: i.unit});
				DOM_Create.text(li,' '+this.lang['ingredient-of']+' ');
			}
		}
		DOM_Create.element('span',li,{class: 'ingredient '+i.label,content: i.ingredient});
		if(mode_edit) {
			$('<img class="ingredient-edit" src="images/icons/pencil.png"></img>').appendTo(li);
			$('<img class="ingredient-del" src="images/icons/delete.png"></img>').appendTo(li);
		}
		// i.comments
	},
	generate_html_comments: function(parent_el,mode_edit) {
		if(!mode_edit) {
			var parent_el = DOM_Create.element('div',parent_el,{class: 'comment-zone'});
			DOM_Create.element('h3',parent_el,{content: this.lang['comments']});
			var div = DOM_Create.element('div',parent_el);
			this.recipe.comments.forEach(function(c) {
				var c_div = DOM_Create.element('div',div);
				// PARSE ANNOTATIONS
				DOM_Create.element('span',c_div,{content: c.text});
				c.annotations.forEach(function(a) {
				});
				DOM_Create.element('span',c_div,{content: c.author});
				DOM_Create.element('span',c_div,{content: (new Date(c.date)).toString()});
			},this);
			f_div = DOM_Create.element('form',div);
			$('<span>'+this.lang['comment-user']+'</span><input type="text" value=""></input>\n<span>'+this.lang['comment-content']+'</span><textarea></textarea><input type="submit" value="'+this.lang['comment-submit']+'"></input>').appendTo(f_div);
		}
	},
	generate_html_prep: function(parent_el,mode_edit) {
		var parent_el = DOM_Create.element('div',parent_el,{class: 'prep-zone'});
		DOM_Create.element('h3',parent_el,{content: this.lang.preparation});
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


