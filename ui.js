$(async function () { // TRYING TO GET THE UI PROFILE TO GET HIDDEN BEFORE I MOVE ON TO THE MY STORIES SECTION
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form');
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $ownStories = $('#my-articles');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $submitStoryBtn = $('#submitStoryBtn');
	const $userProfile = $('#user-profile')
	const $favoriteStories = $('#favorited-articles')
	const $deleteButton = $('.deleteBtn')
	const $myStoryBtn = $('#myStoryButton')

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();
	//on click of the submit button it will display the submit form
	//***************************************************************************************** */
	$submitStoryBtn.on('click', async function () {
		$('#submit-form').slideToggle();

	});
	//When the user submits a story
	$submitForm.on('submit', async function (evt) {
		//prevent refresh on submission
		evt.preventDefault();

		//getting the information from the form using jquery selectors
		let author = $('#author').val();
		let title = $('#title').val();
		let url = $('#url').val();
		//let username be the instance of User with the data from username 
		const username = currentUser.username;
		//set the formStory to the story object that we submit as a parameter, makes it easier to test like this in case there is an error. 
		const formStory = {
			title,
			author,
			url,
			username
		}
		//creating a new instance using the addStory method on the storyList Class defined in the other js file, pass in the parameters of the current user and an object for the story as required by the api rules
		const storyObject = await storyList.addStory(currentUser, formStory);
		//take out before submission , for testing only
		// console.log(generateStoryHTML(storyObject));
		//callback generateStoryHTMl to create a new LI for that I can append to the article List 
		$(generateStoryHTML(storyObject).prependTo('#all-articles-list'));
		//resets the form and hides it again
		$('#submit-form').slideToggle().trigger('reset')
		//we can now successfully submit forms with no issues, note that I still need to fix the needing to reload myStories 

	});
	/********************************************************************************************************** */
	//this navigates to the favorites tab (hides the other elements and only shows the favorites 'tab')
	$('#favoriteStoryBtn').on('click', function (e) {
		//hide all elements
		hideElements();
		//show only the favorites tab
		$favoriteStories.show()
		//this is our callback that we make in this section to show the list of favorites that we are able to now save 
		generateFavorites()

	})
	//put an event listner on all the list elements and listen for the context of anything with a class of heart 
	$('.articles-container').on('click', '.heart', async function (e) {
		//truthy if user is logged in 
		if (currentUser) {
			const $targetHeart = $(e.target)
			// console.log($targetHeart)
			const $parentLI = $targetHeart.parent().parent()
			// console.log($parentLI)
			const storyID = $parentLI.attr("id")
			// console.log(storyID)

			//checking if the target has  a full heart , fas is font awesome solid (full heart)
			if ($targetHeart.hasClass('fas')) {
				//remove the favorite from the user's list, using the removeFavorite method which makes a DELETE request to the api with axios in the api function page
				await currentUser.removeFavorite(storyID)
				//alternate to the empty heart since we are removing it from our favorites list
				$targetHeart.toggleClass('fas far')

				// console.log("we are making it to the if statement")
				// console.log(storyID)


			} else {
				//the item has not been added to favorites
				await currentUser.addFavorite(storyID)
				$targetHeart.closest("i").toggleClass("fas far")

			}
		}
	})

	function isFavorite(story) {
		//create an empty set object for the array of favorite stories that we have
		let favStoryIds = new Set();
		//if user is logged in
		if (currentUser) {
			//lets set our SET equal to a set made up of the individual stories. mapped to a new array with each favorited story id so we can identify the favorites by id
			favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
		}
		//return only the stories that have the correct story id 
		return favStoryIds.has(story.storyId);
	}
	//now we need to append the set of LIs that we have targeted as favorites to the favorites 'tab'
	function generateFavorites() {
		//empty out the list so that we can generate the favorites list each time. 
		$favoriteStories.empty()
		//checking the data from the current user which we know because of the insomnia get request on the api for the users info
		// console.log(currentUser)
		if (currentUser.favorites.length === 0) {
			//notify the user when they have no favorites in the list
			$favoriteStories.append('<h5>You have no favorites</h5>')
		} else {
			for (let story of currentUser.favorites) {
				let favoriteStoryHTML = generateStoryHTML(story)
				$favoriteStories.append(favoriteStoryHTML)
			}

		}

	}



	//******************************************************************************************************* */
	//This is going to be the mystories section complete with the delete button
	$myStoryBtn.on('click', function (e) {
		hideElements();
		if (currentUser) {

			$ownStories.show()
			generateMyStories()
			$('.deleteBtn').show()

		}

		//this is our callback that we make in this section to show the list of favorites that we are able to now save 


	})



	//now we need to append the set of LIs that we have targeted as favorites to the favorites 'tab'
	function generateMyStories() {
		//empty out the list so that we can generate the favorites list each time. 
		$ownStories.empty()

		//checking the data from the current user which we know because of the insomnia get request on the api for the users info
		if (currentUser.ownStories.length === 0) {
			//notify the user when they have no favorites in the list
			$ownStories.append('<h5>You have no stories</h5>')
		} else {
			for (let story of currentUser.ownStories) {
				let myStoryHTML = generateStoryHTML(story)
				$ownStories.append(myStoryHTML)
			}

		}
		$ownStories.show()

	}
	//deleting a story
	$ownStories.on('click', '.deleteBtn', async function (e) {

		let closestLI = $(e.target).closest('li')
		let storyID = closestLI.attr('id')
		// console.log(storyID)

		await storyList.removeStory(currentUser, storyID);

		await generateStories()
		hideElements()
		$allStoriesList.show()
	})



	//******************************************************************************************************* */
	//in order to be able to remove our stories we have to also generate a list of our stories so that we can remove them from both the dom and the api
	/**
	 * Event listener for logging in.
	 *  If successfully we will setup the user instance
	 */
	//selects log in form and adds event listener
	$loginForm.on('submit', async function (evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Event listener for signing up.
	 *  If successfully we will setup a new user instance
	 */

	$createAccountForm.on('submit', async function (evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Log Out Functionality
	 */

	$navLogOut.on('click', function () {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
	 * Event Handler for Clicking Login
	 */

	$navLogin.on('click', function () {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	/**
	 * Event handler for Navigation to Homepage
	 */

	$('body').on('click', '#nav-all', async function () {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
	 * On page load, checks local storage to see if the user is already logged in.
	 * Renders page information accordingly.
	 */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
	}

	/**
	 * A rendering function to run to reset the forms and hide the login info
	 */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	/**
	 * A function to render HTML for an individual Story instance
	 */

	function generateStoryHTML(story) {
		let hostName = getHostName(story.url);
		let heartType = isFavorite(story) ? "fas" : "far"

		// render story markup //added in the span with the star markup for when it isnt a favorite
		const storyMarkup = $(`
      <li id="${story.storyId}"><span class="deleteBtn hidden"><i class="fas fa-trash"></i></span><span class="heart"><i class="${heartType} fa-heart"></i></span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm,
			$favoriteStories,
			$deleteButton,
			$userProfile


		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navLogOut.show();
		$('.hidden-links').show();
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		} else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});