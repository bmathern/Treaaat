<!doctype html>

<?php
	$language = "fr";
	$add_url = "";
	if(isset($_GET['lang'])) {
		$language = $_GET['lang'];
		$add_url = "lang=$language&";
	} elseif(false) { // isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
		//$language = $_SERVER['HTTP_ACCEPT_LANGUAGE'];
		// TODO -> parse language to select between the user's preferences
		preg_match_all('/([a-z]{1,8}(-[a-z]{1,8})?)\s*(;\s*q\s*=\s*(1|0\.[0-9]+))?/i', $_SERVER['HTTP_ACCEPT_LANGUAGE'], $parsed_str);
        	$lang_pref_array = array_combine($parsed_str[1], $parsed_str[4]);
    		foreach($lang_pref_array as $lang => $pref) {
		    if ($pref === '') $lang_pref_array[$lang] = 1;
		}
	        arsort($lang_pref_array, SORT_NUMERIC);
		foreach($lang_pref_array as $lang => $pref) {
			if(strcasecmp($lang.substr(0,2),"fr") == 0) {
				$language = "fr";
			} elseif (strcasecmp($lang.substr(0,2),"en") == 0) {
				$language = "en";
			}
		}
		echo "<!-- {$_SERVER['HTTP_ACCEPT_LANGUAGE']} -->\n";
		echo "<!-- $language -->\n";
	}
	switch($language) {
		case "fr":
			$lang = array(
				"title"		=>	"Treaaat: a Recipe Editor Augmented with Autocompletion, Annotation and Traces.",
				"tab-list"	=>	"Toutes les recettes",
				"tab-new"	=>	"Nouvelle recette",
				"tab-view"	=> 	"Voir",
				"tab-edit"	=>	"Éditer",
				"info-trace"	=>	"Toutes les actions que vous effectuez sur cette page sont tracées et enregistrées (aucune information personnelle n'est collectée). <a href=\"#trace-pan\">Cliquez ici</a> pour afficher votre trace en cours de collecte.",
			);
			break;
		case "en":
		default:
			$lang = array(
				"title"		=>	"Treaaat: a Recipe Editor Augmented with Autocompletion, Annotation and Traces.",
				"tab-list"	=>	"All recipes",
				"tab-new"	=>	"New",
				"tab-view"	=> 	"View",
				"tab-edit"	=>	"Edit",
				"info-trace"	=>	"All the actions that you perform on this interface are traced and recorded (no personal information is collected). <a href=\"#trace-pan\">Click here</a> to display your trace that is being collected.",
			);
			break;
	}
	// defines which tab is active...
	$tab_list = "";
	$tab_new  = "";
	$tab_view = "";
	$tab_edit = "";
	$mode = "list";
	if(isset($_GET['mode'])) {
		$mode = $_GET['mode'];
		$var = "tab_$mode";
		$$var = " class=\"active\"";
	} else {
		$tab_list = " class=\"active\"";
	}
?>
<html>
<head>

<meta charset="utf-8">
<title><?php echo $lang['title']; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="stylesheet" type="text/css" href="css/main.css">
<link rel="stylesheet" type="text/css" href="css/samotraces.css">
<link rel="stylesheet" type="text/css" href="css/jquery.annotatetextarea.css">

<script type="text/javascript" src="javascript/jquery-1.10.2.min.js"></script>
<!-- -->
<script type="text/javascript" src="javascript/jquery.mousewheel.js"></script>
<script type="text/javascript" src="javascript/d3.js"></script>
<script type="text/javascript" src="javascript/Samotraces.js"></script>
<script type="text/javascript" src="javascript/main-trace.js"></script>

<script type="text/javascript" src="javascript/recipe.js"></script>
<script type="text/javascript" src="javascript/jquery.annotatetextarea.js"></script>
<script type="text/javascript" src="javascript/autocomp.js"></script>
<script type="text/javascript">

function init() {
	var recipe = <?php
		if(isset($_GET['recipe'])) {
			echo "JSON.parse(\"";
			$contents = file_get_contents("recipes/{$_GET['recipe']}.json");
			//$contents = utf8_encode($contents);
			$json_recipe = json_decode($contents);
			echo addslashes(trim($contents))."\");";
		} else {
			echo "undefined";
		} ?>;

	var UI = new RecipeUI(recipe);
	<?php	echo "UI.set_language('$language');"; ?>
	<?php echo "var mode = '$mode';\n"; ?>
	// new recipe
	switch(mode) {
		case "view":
		case "edit":
			UI.generate_html("recipe-view");
			UI.generate_html_form("recipe-edit");
			break;
		case "new":
			UI.generate_html_form("recipe-edit");
			break;
		case "list":
		default:
			break;
	}
}

$(window).load(init);

</script>

    <!-- Bootstrap -->
    <link href="css/bootstrap.min.css" rel="stylesheet">

    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
      <script src="https://oss.maxcdn.com/libs/respond.js/1.3.0/respond.min.js"></script>
    <![endif]-->
</head>
<body>

<!--<div class="panel-group">
<div style="width:100%;background-color:white;z-index:10;position:fixed;" class="panel panel-default">
	<div id="trace-pan" class="panel-collapse collapse">
		<div class="panel-body">
			<div id="trace"></div>
			<div id="scale"></div>
		</div>
	</div>
	<div class="panel-headind">
		<span><?php echo $lang['info-trace'] ?></span>
	</div>
</div>
</div>
-->
	<div id="trace-pan" style="width:100%;background-color:white;z-index:10;position:fixed;top:-52px;">
		<div id="trace"></div>
		<div id="scale"></div>
	</div>
<div id="trace-disclamer">
	<span><?php echo $lang['info-trace'] ?></span>
</div>

<!-- Modal -->
<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        <h4 class="modal-title" id="myModalLabel">Modal title</h4>
      </div>
      <div class="modal-body">
        <div id="obsel"></div>
      </div>
    </div>
  </div>
</div>


	<div class="tabbable container" style="position:relative;top:30px;">
		<ul class="nav nav-tabs">
<?php
	echo "\t\t\t<li$tab_list><a href=\"?{$add_url}mode=list\">{$lang['tab-list']}</a></li>";
	echo "\t\t\t<li$tab_new><a href=\"?{$add_url}mode=new\">{$lang['tab-new']}</a></li>";
	if(isset($_GET['recipe'])) {
		$id = $_GET['recipe'];
		echo "\t\t\t<li$tab_view><a href=\"#recipe-view\" data-toggle=\"tab\">{$lang['tab-view']}</a></li>";
		echo "\t\t\t<li$tab_edit><a href=\"#recipe-edit\" data-toggle=\"tab\">{$lang['tab-edit']}</a></li>";
	}
?>
		</ul>

<?php if($mode == "list") { ?>
		<!-- RECIPE LIST -->
		<form id="recipe-list-form">
			<div>
				<h3><?php echo $lang['tab-list']; ?></h3>
				<ul>
<?php
$contents = file_get_contents('recipe_list.json');
$contents = utf8_encode($contents);
$results = json_decode($contents);

foreach($results as $id => $title) {
	echo("\t\t\t\t<li><a href=\"?recipe=$id&mode=view\">$title</a></li>\n");
}
?>
				</ul>
			</div>
		</form>
<?php } elseif($mode == "new") { ?>
		<div id="recipe-edit"></div>
<?php } else { ?>
		<div class="tab-content">
			<!-- RECIPE VIEW -->
			<div class="tab-pane fade<?php if($tab_view!="") echo " in active" ?>" id="recipe-view">
			</div>
			<!-- RECIPE EDIT -->
			<div class="tab-pane fade<?php if($tab_edit!="") echo " in active" ?>" id="recipe-edit">
			</div>
		</div>
    </div>
<?php } ?>

    <!-- Include all compiled plugins (below), or include individual files as needed -->
    <script src="javascript/bootstrap.js"></script>
</body>
</html>
