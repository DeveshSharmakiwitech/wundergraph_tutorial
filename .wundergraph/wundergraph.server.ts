import { GraphQLEnumType, GraphQLList, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { configureWunderGraphServer, WunderGraphRequest } from '@wundergraph/sdk/server';
import type { HooksConfig } from './generated/wundergraph.hooks';
import type { InternalClient } from './generated/wundergraph.internal.client';

import jwt from 'jsonwebtoken';
import { listenerCount } from 'process';

// Define a secret key to use for JWT signing
const JWT_SECRET = 'Querty@12345';

// Define a function to generate a JWT token for the given user
function generateToken(user: { id: string, name: string, email: string }): string {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
  };
  // Sign the JWT token using the secret key and return it
  return jwt.sign(payload, JWT_SECRET);
}

function decodeToken(token: string): any {
// Decode a JWT token and return it
return jwt.verify(token, JWT_SECRET);
	
  }

// Define the User type
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    email: { type: GraphQLString },
    password: { type: GraphQLString },
  }),
});

// Create a new array of User objects
const usersData = [
  { id: '1', name: 'John Doe', email: 'john@example.com', password: '123456' },
  { id: '2', name: 'Jane Doe', email: 'jane@example.com', password: '123456'  },
  { id: '3', name: 'Hritik Thakur', email: 'hritik@example.com', password: '123456'  },
  { id: '4', name: 'Devesh', email: 'devesh@example.com', password: '123456'  },
  { id: '5', name: 'Bijendra', email: 'bijendra@example.com', password: '123456'  },
  { id: '6', name: 'Ayush', email: 'ayush@example.com', password: '123456'  }
];

interface Context {
  headers: {
    authorization?: string;
  };
}

// Define a new query field to return the User array
const MutationType = new GraphQLObjectType({
	name: 'Mutation',
	fields: () => ({
	  createUsers: {
		type: new GraphQLList(UserType),
		args: {
		  id: { type: GraphQLString },
		  name: { type: GraphQLString },
		  email: { type: GraphQLString },
		  password: { type: GraphQLString },
		},
		resolve: (_, { id, name, email, password }, context) => {
		  // define a new user object
		const newUser = {
			id: id,
			name: name,
			email: email,
			password: password
		};
		console.log('newUser :>> ', newUser);
		
		// check if the user already exists in the array
		const userExists = usersData.find(u => u.email === newUser.email);
		
		if (userExists) {
			console.log("User already exists!");
		} else {
			// add the new user to the array
			usersData.push(newUser);
			console.log("New user added!");
			return [newUser];
		}  
		},
	  },
	  updateUser: {
		type: new GraphQLList(UserType),
		args: {
			name: { type: GraphQLString },
		  },
		resolve: (parent, { name }, context) => {
		  const token = context.wundergraph.clientRequest.headers.get('authentication')
		  // Check if the user is authenticated
		  if (!context.wundergraph.clientRequest.headers) {
			throw new Error('Unauthorized');
		  }
		  const { email, id } = decodeToken(token);
		  console.log('email, id :>> ', email, id);
			// define the user's fields to update
			const updatedFields = {
			name: name,
			};

			// find the user by email and id
			const userToUpdate = usersData.find(u => u.email === email && u.id === id);

			if (!userToUpdate) {
				throw new Error("User not found!");
			}

			// update the user's information with the specified fields
			const updatedUser = Object.assign(userToUpdate, updatedFields);

			console.log("User updated successfully!");

			// Return the list of users
			return [updatedUser];
		},
	  },
	deleteUser: {
		type: new GraphQLList(UserType),
		resolve: (parent, args, context) => {
		  const token = context.wundergraph.clientRequest.headers.get('authentication')
		  // Check if the user is authenticated
		  if (!context.wundergraph.clientRequest.headers) {
			throw new Error('Unauthorized');
		  }
		  const { email, id } = decodeToken(token);
		  
		  // find the index of the user with the specified email and id
		  const userIndex = usersData.findIndex(u => u.email === email && u.id === id);
		  
		  if (userIndex === -1) {
			console.log("User not found!");
			return;
		  } else {
			// remove the user object from the array using the splice() method
			const deletedUser = usersData.splice(userIndex, 1);
			console.log("User deleted successfully!");
			return deletedUser;
		  }

		},
	  },
	}),
  });

// Define a new query field to return the User array
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    users: {
      type: new GraphQLList(UserType),
      resolve: (parent, args, context) => {
		const token = context.wundergraph.clientRequest.headers.get('authentication')
        // Check if the user is authenticated
        if (!context.wundergraph.clientRequest.headers) {
          throw new Error('Unauthorized');
        }
		const { email, id } = decodeToken(token);
        const userExist = usersData.find(u => u.email === email && u.id === id);
        if (!userExist) {
          throw new Error('Invalid credentials');
        }
        // Return the list of users
        return [userExist];
      },
    },
    login: {
      type: GraphQLString,
      args: {
        email: { type: GraphQLString },
        password: { type: GraphQLString },
      },
      resolve: (_, { email, password }, context) => {
        const user = usersData.find(u => u.email === email && u.password === password);
        if (!user) {
          throw new Error('Invalid credentials');
        }
        // Generate and return a token for the authenticated user
        return generateToken(user);
      },
    },
  }),
});

// Create a new GraphQL schema with the Query field
const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType
});

// Create a new object that implements the GraphQLServerConfig interface
const serverConfig = {
  serverName: 'my-graphql-server',
  schema,
};

// Pass the serverConfig object to the configureWunderGraphServer function
export default configureWunderGraphServer<HooksConfig, InternalClient>(() => ({
  hooks: {
    queries: {},
    mutations: {},
  },
  graphqlServers: [serverConfig],
}));
