<?php

if( isset($_POST['recipe']) ) {
	// Saves the json document into a file
	$counter = 1;
	while(file_exists('recipes/'.sprintf('r%1$03d.json',$counter))) {
		$counter++;
	}
	$f_name = sprintf('r%1$03d',$counter);
	// TODO -> check the file first -> otherwise, security pbm
	file_put_contents("recipes/$f_name.json",$_POST['recipe']);
	echo($f_name);

	// adds the file to the index:
	$recipe = json_decode($_POST['recipe']);
	$title = $recipe->title;
	$contents = file_get_contents('recipe_list.json');
	$contents = utf8_encode($contents);
	$results = json_decode($contents);
	$results->{$f_name} = $title;
	$contents = json_encode($results);
	file_put_contents('recipe_list.json',$contents);
}

?>
