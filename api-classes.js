const BASE_URL = 'https://hack-or-snooze-v3.herokuapp.com';

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
	constructor(stories) {
		this.stories = stories;
	}

	/**
	 * This method is designed to be called to generate a new StoryList.
	 *  It:
	 *  - calls the API
	 *  - builds an array of Story instances
	 *  - makes a single StoryList instance out of that
	 *  - returns the StoryList instance.*
	 */

	static async getStories() {
		// query the /stories endpoint (no auth required)
		const response = await axios.get(`${BASE_URL}/stories`);

		// turn the plain old story objects from the API into instances of the Story class
		const stories = response.data.stories.map((story) => new Story(story));
		// console.log(stories)//testing purposes checks to make sure we get back an array of objects (story instances)

		// build an instance of our own class using the new array of stories
		const storyList = new StoryList(stories);

		return storyList;
	}

	/**
	 * Method to make a POST request to /stories and add the new story to the list
	 * - user - the current instance of User who will post the story
	 * - newStory - a new story object for the API with title, author, and url
	 *
	 * Returns the new story object
	 */

	async addStory(user, newStory) {
		// this function should return the newly created story so it can be used in
		// the script.js file where it will be appended to the DOM
		const response = await axios.post(`${BASE_URL}/stories`, {
			token: user.loginToken,
			story: newStory
		});
		//extracting the story from the post request so that we can create a new Story to append
		newStory = new Story(response.data.story);
		//this is prepending it to the array where the list of stories is
		this.stories.unshift(newStory);

		return newStory;
	}
	//we need to add in a method to our storyList instances so we can remove the user stories
	async removeStory(user, storyId) {
		//Comment the shit out of this tomorrow morning
		//follow the api style to remove using the delete method
		await axios({
			url: `${BASE_URL}/stories/${storyId}`,
			method: 'DELETE',
			data: {
				//use our currentUsers login token thisll be handled on the UI side
				token: user.loginToken
			}
		});

		// filter out the story with the ID that are removing , get back an array of LIs we can append to our stories list
		this.stories = this.stories.filter((story) => story.storyId !== storyId);

		// do the same thing for the user's list of stories
		user.ownStories = user.ownStories.filter((s) => s.storyId !== storyId);
	}
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
	constructor(userObj) {
		this.username = userObj.username;
		this.name = userObj.name;
		this.createdAt = userObj.createdAt;
		this.updatedAt = userObj.updatedAt;

		// these are all set to defaults, not passed in by the constructor
		this.loginToken = '';
		this.favorites = [];
		this.ownStories = [];
	}

	/* Create and return a new user.
	 *
	 * Makes POST request to API and returns newly-created user.
	 *
	 * - username: a new username
	 * - password: a new password
	 * - name: the user's full name
	 */

	static async create(username, password, name) {
		const response = await axios.post(`${BASE_URL}/signup`, {
			user: {
				username,
				password,
				name
			}
		});

		// build a new User instance from the API response
		const newUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		newUser.loginToken = response.data.token;

		return newUser;
	}

	/* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

	static async login(username, password) {
		const response = await axios.post(`${BASE_URL}/login`, {
			user: {
				username,
				password
			}
		});

		// build a new User instance from the API response
		const existingUser = new User(response.data.user);

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
		existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = response.data.token;

		return existingUser;
	}

	/** Get user instance for the logged-in-user.
	 *
	 * This function uses the token & username to make an API request to get details
	 *   about the user. Then it creates an instance of user with that info.
	 */

	static async getLoggedInUser(token, username) {
		// if we don't have user info, return null
		if (!token || !username) return null;

		// call the API
		const response = await axios.get(`${BASE_URL}/users/${username}`, {
			params: {
				token
			}
		});

		// instantiate the user from the API information
		const existingUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = token;

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
		existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));
		return existingUser;
	}
	//update the userInfo at the bottom of the page by retrieving all of the info and filling it in useing acios.get on a single user

	async retrieveDetails() {
		const response = await axios.get(`https://hack-or-snooze-v3.herokuapp.com/users/${this.username}`, {
			params: {
				token: this.loginToken
			}
		});
		//gets the favorites of the response above , acccording the the api information we pulled (check insomnia Get User). we create a new Story instance specifically to create the list of favorites that we are extracting from the main articles list.
		this.favorites = response.data.user.favorites.map((faveStories) => new Story(faveStories));
		//from the same response we can also pull data on the stories that the user has created themselves that also makes its own list
		this.ownStories = response.data.user.stories.map((userStories) => new Story(userStories));

		return this;
	}
	/**
	 * Add a story to the list of user favorites and update the API
	 * - storyId: an ID of a story to add to favorites
	 */

	addFavorite(storyId) {
		//returns the user after we send a post request to the api to update our favorites list
		return this._toggleFavorite(storyId, 'POST');
	}

	/**
	 * Remove a story to the list of user favorites and update the API
	 * - storyId: an ID of a story to remove from favorites
	 */

	removeFavorite(storyId) {
		return this._toggleFavorite(storyId, 'DELETE');
	}

	/**
	 * A helper method to either POST or DELETE to the API
	 * - storyId: an ID of a story to remove from favorites
	 * - httpVerb: POST or DELETE based on adding or removing
	 */
	//we are going to toggle the favorite using the specific LI(identified with the StoryId) we specify by clicking the star ( heart in my case), and then we are going to change the verb based on either POST or DELETE depending on if we are favoriting or we are unfavoriting.
	async _toggleFavorite(storyId, httpVerb) {
		//send the request to the api based on the httpVerb either post or delete
		await axios({
			//standard info this is the given api url , with our This instance of the User class, and we send the request with the link to the specific story (ID of the li)
			url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
			//whatever method we are using , this is the format specified by the API do an insomnia check on this
			method: httpVerb,
			//data we are using is the token Auth because we need it for everything except the stories list. the login Token is for THIS user instance because we are still in the user class.
			data: {
				token: this.loginToken
			}
		});
		//call the retrieve details method on this user instance to get info for the user stories and favorites which updates the user instance
		await this.retrieveDetails();
		//returns the User
		return this;
	}
}

/**
 * Class to represent a single story.
 */

class Story {
	/**
	 * The constructor is designed to take an object for better readability / flexibility
	 * - storyObj: an object that has story properties in it
	 */

	constructor(storyObj) {
		this.author = storyObj.author;
		this.title = storyObj.title;
		this.url = storyObj.url;
		this.username = storyObj.username;
		this.storyId = storyObj.storyId;
		this.createdAt = storyObj.createdAt;
		this.updatedAt = storyObj.updatedAt;
	}
}