import React from 'react';
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import { jest, describe, it, expect } from '@jest/globals';
import Home from "@/app/page";
import { heroHeading } from "@/constants";

// Mock the Hero component
jest.mock("@/components/shared/Hero", () => {
    return function MockHero() {
        return <h1>{heroHeading}</h1>;
    };
});



describe("Home", () => {
    it("renders the hero heading", () => {
        render(<Home />);

        const heading = screen.getByRole("heading", {
            name: new RegExp(heroHeading.replace(/\n/g, '\\s*'), 'i'),
        });

        expect(heading).toBeInTheDocument();
    });
});