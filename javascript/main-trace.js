
$(window).load(function() {

//	trace = new Samotraces.LocalTrace();
//	trace = new Samotraces.KTBS.Trace('test','http://dsi-liris-silex.univ-lyon1.fr/ofs/ktbs/test/test/');
	base = new Samotraces.KTBS.Base('http://127.0.0.1/ktbs/test_obsel_type/','test');
	var id = (Date.now()).toString()+"_v0";
	base.create_stored_trace(id);
prompt('t','t');	
	trace = base.get_trace(id);
//	trace = new Samotraces.KTBS.Trace('test','http://127.0.0.1/ktbs/test/toto2/');


	/* TIME-WINDOW HANDLER */
	var timer = new Samotraces.Timer(0);
	var tw = new Samotraces.TimeWindow({start: 0, end: 10});
	var offset = 5;
	function calc_tw() {
		var px_width = $('#trace').prop('clientWidth');
		var w = px_width / 16;
		tw.set_width(w,timer.time - w/2 + offset);
	};
	calc_tw();
	$(window).resize(calc_tw);
	timer.on('timer:update',function(e) {
		tw.translate(e.data- (tw.end-offset) );
	});

	/* TRACE VISUALISATION */
	var opt = {
		x: function(o) {
//console.log("t:",o.attributes.count,(o.attributes.count - this.window.start)*this.scale_x,this.window.start);
//console.log("x:",this.calculate_x(o.attributes.count || 0));
			return this.calculate_x(o.get_attribute('count') || 0);
		},
		url: function(o) {
			var path = "images/icons/";
			switch(o.get_type()) {
				case 'click':
					return path+'cursor.png';
				case 'focusin':
					return path+'resultset_next.png';
				case 'mouseenter':
					//return path+'mouse.png';
					return path+'arrow_in.png';
				case 'mouseleave':
					return path+'mouse.png';
					//return path+'mouse_delete.png';
					//return path+'arrow_out.png'; // TODO
				case 'keyup':
					return path+'pencil.png';
					//return path+'keyboard.png';
				case 'Autocompleter:selection':
					return path+'arrow_switch.png';
				case 'Autocompleter:autocomplete':
					return path+'accept.png';
				case 'recipe:ingredient:add':
					return path+'textfield_add.png';
					//return path+'add.png';
				case 'recipe:save':
					return path+'disk.png';
				default:
					return path+'help.png';
			}
		}
	};
	new Samotraces.UI.Widgets.TraceDisplayIcons('trace',trace,tw,opt);
	new Samotraces.UI.Widgets.WindowScale('scale',tw);

	/* SELECTING OBSEL */
	var sel = new Samotraces.Selector('Obsel');
	$('body').on('click','.Samotraces-obsel',function(e) {
		sel.select($.data(e.target,'Samotraces-data'));
	});

	/* OBSEL INSPECTOR */
	sel.on('selection:add',function(e) {
		var o = e.data;
console.log(o);
		$('#myModalLabel').text('Obsel '+o.id);
		var html = [];
		html.push('<div class="panel panel-default">');
		html.push('<div class="panel-body">');
		html.push('<dl class="dl-horizontal">');
'<div class="panel-heading"><h3 class="panel-title">Attributes</h3></div><div class="panel-body">Panel content</div></div>'

		html.push('<dt>Type</dt><dd>'+o.get_type()+'</dd>');
		html.push('<dt>Begin</dt><dd>'+o.get_begin()+'</dd>');
		html.push('<dt>Begin - converted</dt><dd>'+Date(o.get_begin())+'</dd>');
		html.push('</dl>');
		html.push('</div></div>');
		html.push('<div class="panel panel-default">');
		html.push('<div class="panel-heading"><h3 class="panel-title">Attributes</h3></div>');
		html.push('<div class="panel-body">');
		html.push('<dl class="dl-horizontal">');
		for(var key in o.attributes) {
			html.push('<dt>'+key+'</dt><dd>'+o.get_attribute(key)+'</dd>');
		};
		html.push('</dl>');
		html.push('</div></div>');
		$(html.join('')).appendTo('#obsel');
		$('#myModal').modal('show');
	});

	$('#myModal').on('hide.bs.modal',function(e) {
		sel.empty();
		$('#obsel').empty();
	});


	/* COLLECTING THE TRACE */
	var count = 0;
	var collector = function(e,data) {
		var attr = {};
		attr.url = document.location.href;
		attr.count = count++;
/*
		if(typeof(e.target.id) !== "undefined" && e.target.id !== "") {
			attr.id = e.target.id;
		}
*/
		attr.tagName = e.target.tagName;
		attr.target = getXPath(e.target);
		switch(e.type) {
			case 'click':
			case 'focusin':
				break;
			case 'mouseenter':
			case 'mouseleave':
				attr.innerHTML = e.target.innerHTML;
				if(attr.tagName == "A") {
					attr.href = e.target.href;
				} else {
					attr.class = e.target.className;
				}
				break;
			case 'keyup':
				attr.key = String.fromCharCode(e.keyCode);
				attr.keyCode = e.keyCode;
				attr.ctrlKey = e.ctrlKey;
				attr.altKey = e.altKey;
				attr.shiftKey = e.shiftKey;
				attr.selectionStart = e.target.selectionStart;
				attr.selectionEnd = e.target.selectionEnd;
				break;
			case 'Autocompleter:selection':
			case 'Autocompleter:autocomplete':
				attr.text = data.text;
				attr.label = data.label;
				attr.class = data.class;
				break;
			case 'recipe:ingredient:add':
				attr.ingredient = data.text;
				attr.label = data.label;
				attr.quantity = data.qtt;
				attr.unit = data.unit;
				break;
			case 'recipe:save':
			default:
				break;
		}
		trace.create_obsel({
			type: e.type,
			begin: Date.now(),
			attributes: attr
		});
		timer.set(count);
	};
	public_collector = function(type,attributes) {
		var attr = {};
		attr.url = document.location.href;
		attr.count = count++;
		for(var key in attributes) {
			attre[key] = attributes[key];
		}
		trace.create_obsel({
			type: e.type,
			begin: Date.now(),
			attributes: attr
		});
		timer.set(count);		
	};

	$('body').on('click focusin',collector);
	$('body').on('mouseenter mouseleave','a,.ingredient,.ustensile,.Autocompleter li',collector);
	$('body').on('keyup','input,textarea',collector);

	// TODO autocomplete events -> selecting with arrows + autocompleting
	$('body').on('Autocompleter:selection',collector);
	$('body').on('Autocompleter:autocomplete','textarea,input',collector);

	// TODO ingredient add events
	$('body').on('recipe:ingredient:add',collector);
	// TODO save event
	$('body').on('recipe:save',collector);
});


// from Trace-Me
function getXPath(element) {
	
	// derived from http://stackoverflow.com/a/3454579/1235487
	while (element && element.nodeType !== 1) {
		element = element.parentNode;
	}
	if (typeof(element) === "undefined") { return "(undefined)"; }
	if (element === null) { return "(null)"; }

	var xpath = '';
	for(true; element && element.nodeType === 1; element = element.parentNode) {
		if(typeof(element.id) !== "undefined" && element.id !== "") return "#" + element.id + xpath;
		var pos = ($(element.parentNode)
		          .children(element.tagName)
		          .index(element) + 1);
		pos = (pos > 1  ?  '[' + pos + ']'  :  '');
		xpath = '/' + element.tagName.toLowerCase() + pos + xpath;
	}

	return xpath;
}
