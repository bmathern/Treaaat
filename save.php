<?php

if( isset($_POST['recipe']) ) {
	// Saves the json document into a file
	$counter = 1;
	while(file_exists('recipes/'.sprintf('r%1$03d.json',$counter))) {
		$counter++;
	}

	// decodes the JSON file
	$recipe = json_decode($_POST['recipe']);
	$f_name = sprintf('r%1$03d',$counter);

	// handles the pictures
	foreach ($_FILES["pictures"]["error"] as $key => $error) {
		if ($error == UPLOAD_ERR_OK) {
		    $tmp_name = $_FILES["pictures"]["tmp_name"][$key];
		    $name = $_FILES["pictures"]["name"][$key];
			$url_img = "recipes/{$f_name}_$name";
		    move_uploaded_file($tmp_name, $url_img);
			$recipe->images[] = json_decode("{\"url\": \"$url_img\", \"description\": \"\"}");
		}
	}

	// TODO -> check the file first -> otherwise, security pbm
	file_put_contents("recipes/$f_name.json",json_encode($recipe));
	echo($f_name);


	// adds the file to the index:
	$title = $recipe->title;
	$contents = file_get_contents('recipe_list.json');
	$contents = utf8_encode($contents);
	$results = json_decode($contents);
	$results->{$f_name} = $title;
	$contents = json_encode($results);
	file_put_contents('recipe_list.json',$contents);
}

?>
