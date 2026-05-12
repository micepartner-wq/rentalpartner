import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ReviewCreatePage } from './ReviewCreatePage';

export const ReviewEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/review" replace />;
  }

  return <ReviewCreatePage editPostId={id} />;
};

export default ReviewEditPage;
