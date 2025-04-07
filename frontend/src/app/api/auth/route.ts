'use server'

import { cookies } from 'next/headers'

type SignInUser = {
  username: string;
  password: string;
}

type SignUpUser = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export async function signIn(data: SignInUser) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log("[Auth route] signIn: received data:", responseData);
      
      // Check for the Set-Cookie header
      const setCookieHeader = response.headers.get('Set-Cookie');
      console.log("[Auth route] signIn: Set-Cookie header:", setCookieHeader);

      if (setCookieHeader) {
        // Parse the Set-Cookie header
        const cookieParts = setCookieHeader.split(';');
        const jwtCookie = cookieParts[0].split('=');
        if (jwtCookie[0] === 'jwt') {
          // Manually set the cookie
          cookies().set('jwt', jwtCookie[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          });
        }
      }

      console.log("[Auth route] Cookies after login:", cookies().getAll());
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, user: {
        id: responseData._id,
        username: responseData.username,
        email: responseData.email,
        firstName: responseData.firstName,
        lastName: responseData.lastName,
        image: responseData.image
      } };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Sign in failed' };
    }
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signUp(data: SignUpUser) {

  try {

    console.log("[Auth route] signUp req data:", data);

    const response = await fetch(`${process.env.BACKEND_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const data = await response.json();
      // Check for the Set-Cookie header
      const setCookieHeader = response.headers.get('Set-Cookie');
      console.log("[Auth route] Set-Cookie header:", setCookieHeader);

      if (setCookieHeader) {
        // Parse the Set-Cookie header
        const cookieParts = setCookieHeader.split(';');
        const jwtCookie = cookieParts[0].split('=');
        if (jwtCookie[0] === 'jwt') {
          // Manually set the cookie
          cookies().set('jwt', jwtCookie[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          });
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, user: {
        id: data._id,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        image: data.image
      } };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Sign up failed' };
    }
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function signOut() {
  try {
    const jwt = cookies().get('jwt');
    console.log(`[Auth route] JWT before logout:`, jwt);

    const response = await fetch(`${process.env.BACKEND_URL}/api/users/logout`, {
      method: 'POST',
      headers: {
        'Cookie': `jwt=${jwt?.value}`,
        'Content-Type': 'application/json'
      },
    });

    console.log(`[Auth route] Logout response:`, response.status, response.statusText);
    
    // Manually delete the JWT cookie
    cookies().delete('jwt');

    if (response.ok) {
      console.log(`[Auth route] Cookies after logout:`, cookies().getAll());
      return { success: true };
    } else {
      const errorData = await response.json();
      console.error('Logout failed:', errorData);
      return { success: false, error: errorData.message || 'Sign out failed' };
    }
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getLoggedInUser() {
  try {
    const jwt = cookies().get('jwt');
    console.log(`[Auth Route] getLoggedInUser, jwt token: ${jwt?.value}`)

    const response = await fetch(`${process.env.BACKEND_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Cookie': `jwt=${jwt?.value}`,
      }
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data}
    } else {
      return { success: false, data}
    }

  } catch (error) {
    console.log(`[Auth Route] Error in getting logged in user details: ${error}`)
  }
}