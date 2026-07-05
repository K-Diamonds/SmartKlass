import { SetMetadata } from '@nestjs/common';
import {
  COURSE_OWNER_KEY,
  REQUIRE_COURSE_ACCESS_KEY,
  REQUIRE_LESSON_ACCESS_KEY,
} from '../access.constants';

export const RequireCourseAccess = (paramKey = 'id') =>
  SetMetadata(REQUIRE_COURSE_ACCESS_KEY, { paramKey });

export const RequireLessonAccess = (paramKey = 'id') =>
  SetMetadata(REQUIRE_LESSON_ACCESS_KEY, { paramKey });

export const CourseOwnerOnly = (paramKey = 'id') =>
  SetMetadata(COURSE_OWNER_KEY, { paramKey });
